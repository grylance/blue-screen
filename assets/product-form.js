if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        if (!this.form) return;

        this.variantIdInput = this.form.querySelector('[name="id"]');
        if (this.variantIdInput) {
          this.variantIdInput.disabled = false;
        }

        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton
          ? this.submitButton.querySelector('span')
          : null;

        this.loadingSpinner = this.querySelector('.loading__spinner');

        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));

        this.cart =
          document.querySelector('cart-notification') ||
          document.querySelector('cart-drawer');

        if (this.submitButton && document.querySelector('cart-drawer')) {
          this.submitButton.setAttribute('aria-haspopup', 'dialog');
        }

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (!this.submitButton) return;

        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', false);
        this.submitButton.classList.add('loading');

        if (this.loadingSpinner) {
          this.loadingSpinner.classList.remove('hidden');
        }

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);

        if (this.cart && typeof this.cart.getSectionsToRender === 'function') {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement?.(document.activeElement);
        }

        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });

              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (soldOutMessage) {
                this.submitButton.setAttribute('aria-disabled', true);
                if (this.submitButtonText) {
                  this.submitButtonText.classList.add('hidden');
                }
                soldOutMessage.classList.remove('hidden');
              }

              this.error = true;
              return;
            }

            if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            const startMarker =
              window.CartPerformance?.createStartingMarker?.('add:wait-for-subscribers');

            if (!this.error) {
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              })?.then?.(() => {
                window.CartPerformance?.measureFromMarker?.(
                  'add:wait-for-subscribers',
                  startMarker
                );
              });
            }

            this.error = false;

            const quickAddModal = this.closest('quick-add-modal');

            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    window.CartPerformance?.measure?.(
                      'add:paint-updated-sections',
                      () => {
                        this.cart.renderContents(response);
                      }
                    );
                  });
                },
                { once: true }
              );

              quickAddModal.hide(true);
            } else {
              window.CartPerformance?.measure?.('add:paint-updated-sections', () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            console.error('Product form error:', e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');

            if (this.cart?.classList?.contains('is-empty')) {
              this.cart.classList.remove('is-empty');
            }

            if (!this.error && this.submitButton) {
              this.submitButton.removeAttribute('aria-disabled');
            }

            if (this.loadingSpinner) {
              this.loadingSpinner.classList.add('hidden');
            }

            window.CartPerformance?.measureFromEvent?.('add:user-action', evt);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        const wrapper =
          this.querySelector('.product-form__error-message-wrapper');

        if (!wrapper) return;

        const messageEl = wrapper.querySelector('.product-form__error-message');

        wrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage && messageEl) {
          messageEl.textContent = errorMessage;
        }
      }
    }
  );
}