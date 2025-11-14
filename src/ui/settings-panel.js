/**
 * Settings Panel
 * GitHub-inspired settings UI for configuring Ollama AI settings
 */

import { getSettings, updateSettings, validateEndpointUrl } from '../state/settings-manager.js';

export class SettingsPanel {
  constructor() {
    this.panel = null;
    this.overlay = null;
    this.isOpen = false;
  }

  /**
   * Create the settings panel DOM structure
   */
  create() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-overlay';
    this.overlay.addEventListener('click', () => this.close());

    // Create panel
    this.panel = document.createElement('div');
    this.panel.className = 'settings-panel';
    this.panel.addEventListener('click', (e) => e.stopPropagation());

    // Header
    const header = document.createElement('div');
    header.className = 'settings-header';

    const title = document.createElement('h2');
    title.textContent = 'Settings';

    const closeButton = document.createElement('button');
    closeButton.className = 'settings-close-button';
    closeButton.innerHTML = '&times;';
    closeButton.setAttribute('aria-label', 'Close settings');
    closeButton.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeButton);

    // Content
    const content = document.createElement('div');
    content.className = 'settings-content';

    // Create form
    const form = this.createForm();
    content.appendChild(form);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'settings-footer';

    const saveButton = document.createElement('button');
    saveButton.className = 'settings-save-button';
    saveButton.textContent = 'Save';
    saveButton.setAttribute('data-testid', 'settings-save-button');
    saveButton.addEventListener('click', () => this.save());

    const cancelButton = document.createElement('button');
    cancelButton.className = 'settings-cancel-button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => this.close());

    footer.appendChild(cancelButton);
    footer.appendChild(saveButton);

    // Assemble panel
    this.panel.appendChild(header);
    this.panel.appendChild(content);
    this.panel.appendChild(footer);

    return this;
  }

  /**
   * Create settings form
   */
  createForm() {
    const settings = getSettings();

    const form = document.createElement('form');
    form.className = 'settings-form';
    form.setAttribute('data-testid', 'settings-form');

    // Ollama Configuration Section
    const ollamaSection = this.createSection('Ollama Configuration');

    // Endpoint URL
    const endpointGroup = this.createFormGroup(
      'endpoint',
      'Endpoint URL',
      'text',
      settings.ollama.endpoint,
      'http://localhost:11434'
    );
    ollamaSection.appendChild(endpointGroup);

    // Model
    const modelGroup = this.createFormGroup(
      'model',
      'Model',
      'text',
      settings.ollama.model,
      'llama2'
    );
    ollamaSection.appendChild(modelGroup);

    form.appendChild(ollamaSection);

    // Model Settings Section
    const modelSection = this.createSection('Model Settings');

    // System Prompt
    const promptGroup = this.createFormGroup(
      'systemPrompt',
      'System Prompt',
      'textarea',
      settings.ollama.systemPrompt,
      ''
    );
    modelSection.appendChild(promptGroup);

    form.appendChild(modelSection);

    // Advanced Section
    const advancedSection = this.createSection('Advanced');

    // Temperature
    const temperatureGroup = this.createFormGroup(
      'temperature',
      'Temperature',
      'range',
      settings.ollama.temperature,
      '0.7',
      { min: 0, max: 1, step: 0.1 }
    );
    advancedSection.appendChild(temperatureGroup);

    // Top P
    const topPGroup = this.createFormGroup('topP', 'Top P', 'range', settings.ollama.topP, '0.9', {
      min: 0,
      max: 1,
      step: 0.1,
    });
    advancedSection.appendChild(topPGroup);

    form.appendChild(advancedSection);

    return form;
  }

  /**
   * Create a form section
   */
  createSection(title) {
    const section = document.createElement('div');
    section.className = 'settings-section';

    const sectionTitle = document.createElement('h3');
    sectionTitle.className = 'settings-section-title';
    sectionTitle.textContent = title;

    section.appendChild(sectionTitle);

    return section;
  }

  /**
   * Create a form group (label + input)
   */
  createFormGroup(name, label, type, value, placeholder, attrs = {}) {
    const group = document.createElement('div');
    group.className = 'settings-form-group';

    const labelEl = document.createElement('label');
    labelEl.className = 'settings-label';
    labelEl.textContent = label;
    labelEl.setAttribute('for', `settings-${name}`);

    let input;
    if (type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 4;
      input.value = value;
    } else {
      input = document.createElement('input');
      input.type = type;
      input.value = value;

      // Apply additional attributes (for range inputs)
      Object.keys(attrs).forEach((key) => {
        input.setAttribute(key, attrs[key]);
      });
    }

    input.id = `settings-${name}`;
    input.name = name;
    input.className = 'settings-input';
    input.setAttribute('data-testid', `settings-${name}`);

    if (placeholder) {
      input.placeholder = placeholder;
    }

    // Show current value for range inputs
    if (type === 'range') {
      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'settings-range-value';
      valueDisplay.textContent = value;
      input.addEventListener('input', () => {
        valueDisplay.textContent = input.value;
      });

      group.appendChild(labelEl);
      group.appendChild(input);
      group.appendChild(valueDisplay);
    } else {
      group.appendChild(labelEl);
      group.appendChild(input);
    }

    // Add validation error element
    const errorEl = document.createElement('div');
    errorEl.className = 'settings-error';
    errorEl.id = `settings-${name}-error`;
    group.appendChild(errorEl);

    return group;
  }

  /**
   * Validate form data
   */
  validate(data) {
    const errors = {};

    // Validate endpoint URL
    if (!validateEndpointUrl(data.endpoint)) {
      errors.endpoint = 'Please enter a valid HTTP or HTTPS URL';
    }

    // Validate model
    if (!data.model || data.model.trim() === '') {
      errors.model = 'Model is required';
    }

    // Validate temperature
    const temp = parseFloat(data.temperature);
    if (isNaN(temp) || temp < 0 || temp > 1) {
      errors.temperature = 'Temperature must be between 0 and 1';
    }

    // Validate topP
    const topP = parseFloat(data.topP);
    if (isNaN(topP) || topP < 0 || topP > 1) {
      errors.topP = 'Top P must be between 0 and 1';
    }

    return errors;
  }

  /**
   * Show validation errors
   */
  showErrors(errors) {
    // Clear all errors first
    const errorElements = this.panel.querySelectorAll('.settings-error');
    errorElements.forEach((el) => (el.textContent = ''));

    // Show new errors
    Object.keys(errors).forEach((field) => {
      const errorEl = this.panel.querySelector(`#settings-${field}-error`);
      if (errorEl) {
        errorEl.textContent = errors[field];
      }
    });
  }

  /**
   * Save settings
   */
  save() {
    const form = this.panel.querySelector('.settings-form');
    /* global FormData */
    const formData = new FormData(form);

    const data = {
      endpoint: formData.get('endpoint'),
      model: formData.get('model'),
      systemPrompt: formData.get('systemPrompt'),
      temperature: formData.get('temperature'),
      topP: formData.get('topP'),
    };

    // Validate
    const errors = this.validate(data);

    if (Object.keys(errors).length > 0) {
      this.showErrors(errors);
      return;
    }

    // Update settings
    updateSettings({
      ollama: {
        endpoint: data.endpoint,
        model: data.model,
        systemPrompt: data.systemPrompt,
        temperature: parseFloat(data.temperature),
        topP: parseFloat(data.topP),
      },
    });

    this.close();
  }

  /**
   * Open the settings panel
   */
  open() {
    if (this.isOpen) {
      return;
    }

    if (!this.panel) {
      this.create();
    }

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.panel);

    this.isOpen = true;

    // Focus first input
    const firstInput = this.panel.querySelector('.settings-input');
    if (firstInput) {
      firstInput.focus();
    }

    // Handle ESC key
    this.escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escHandler);
  }

  /**
   * Close the settings panel
   */
  close() {
    if (!this.isOpen) {
      return;
    }

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }

    this.isOpen = false;

    // Remove ESC handler
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
      this.escHandler = null;
    }
  }

  /**
   * Destroy the panel
   */
  destroy() {
    this.close();
    this.panel = null;
    this.overlay = null;
  }
}
