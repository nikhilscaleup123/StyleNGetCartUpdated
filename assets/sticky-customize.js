/**
 * Compact sticky buy box:
 * - ScaleUp Customize OR Add to cart
 * - Visible only while Description accordion is expanded
 * - Hidden after description end (no overlap on related products)
 */
(function () {
  var MEDIA_QUERY = '(min-width: 750px)';
  var CUSTOMIZE_SELECTOR = '#scaleup-product-button, [id="scaleup-product-button"]';
  var DESC_SELECTOR = '#ProductMediaDescription, .product__media-description';

  function init() {
    var bar = document.getElementById('StickyCustomize');
    var stickyBtn = document.getElementById('StickyCustomizeButton');
    var stickyPrice = document.getElementById('StickyCustomizePrice');
    var stickyQty = document.getElementById('StickyQtyInput');
    var stickyQtyMinus = document.getElementById('StickyQtyMinus');
    var stickyQtyPlus = document.getElementById('StickyQtyPlus');
    if (!bar || !stickyBtn) return;

    var sectionId = bar.getAttribute('data-section-id');
    var atcLabel = bar.getAttribute('data-atc-label') || 'Add to cart';
    var customizeLabel = bar.getAttribute('data-customize-label') || 'Customize';
    var mql = window.matchMedia(MEDIA_QUERY);
    var sourceBtn = null;
    var sourceMode = 'cart';
    var observer = null;
    var descObserver = null;
    var syncingQty = false;

    function mainQtyInput() {
      return document.getElementById('Quantity-' + sectionId);
    }

    function mainPriceEl() {
      return document.getElementById('price-' + sectionId);
    }

    function variantRoot() {
      return document.getElementById('variant-selects-' + sectionId);
    }

    function atcButton() {
      return document.getElementById('ProductSubmitButton-' + sectionId);
    }

    function descriptionRoot() {
      return document.querySelector(DESC_SELECTOR);
    }

    function descriptionDetails() {
      var root = descriptionRoot();
      if (!root) return null;
      var details = root.querySelector('details');
      if (details) return details;
      return root.querySelector('.product-accordion-tabs__header');
    }

    function updateCtaAppearance() {
      if (sourceMode === 'customize') {
        stickyBtn.textContent = customizeLabel;
        stickyBtn.classList.add('sticky-customize__button--customize');
        stickyBtn.classList.remove('sticky-customize__button--cart');
      } else {
        stickyBtn.textContent = atcLabel;
        stickyBtn.classList.add('sticky-customize__button--cart');
        stickyBtn.classList.remove('sticky-customize__button--customize');
      }
    }

    function findSource() {
      var customize = document.querySelector(CUSTOMIZE_SELECTOR);
      if (customize) {
        sourceBtn = customize;
        sourceMode = 'customize';
        updateCtaAppearance();
        return sourceBtn;
      }

      var atc = atcButton();
      if (atc) {
        sourceBtn = atc;
        sourceMode = 'cart';
        updateCtaAppearance();
        return sourceBtn;
      }

      sourceBtn = null;
      return null;
    }

    function setVisible(show) {
      if (!mql.matches) {
        bar.hidden = true;
        bar.classList.remove('is-visible');
        return;
      }
      if (show) {
        syncFromMain();
        bar.hidden = false;
        requestAnimationFrame(function () {
          bar.classList.add('is-visible');
        });
      } else {
        bar.classList.remove('is-visible');
        window.setTimeout(function () {
          if (!bar.classList.contains('is-visible')) bar.hidden = true;
        }, 200);
      }
    }

    function syncPrice() {
      if (!stickyPrice) return;
      var price = mainPriceEl();
      if (price) stickyPrice.innerHTML = price.innerHTML;
    }

    function syncOptionSelected() {
      var root = variantRoot();
      if (!root) return;
      bar.querySelectorAll('.sticky-customize__value').forEach(function (btn) {
        var name = btn.getAttribute('data-option-name');
        var value = btn.getAttribute('data-value');
        var input = root.querySelector(
          'input[type="radio"][name="' + CSS.escape(name) + '"][value="' + CSS.escape(value) + '"]'
        );
        var selected = !!(input && input.checked);
        btn.classList.toggle('is-selected', selected);
        btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
        if (selected) {
          var labelSelected = bar.querySelector('[data-selected-swatch-value="' + CSS.escape(name) + '"]');
          if (labelSelected) labelSelected.textContent = value;
        }
      });
    }

    function syncQtyFromMain() {
      if (syncingQty || !stickyQty) return;
      var main = mainQtyInput();
      if (!main) return;
      syncingQty = true;
      stickyQty.value = main.value;
      stickyQty.min = main.min || stickyQty.min;
      if (main.max) stickyQty.max = main.max;
      syncingQty = false;
    }

    function syncFromMain() {
      syncPrice();
      syncOptionSelected();
      syncQtyFromMain();
    }

    function writeQtyToMain(value) {
      var main = mainQtyInput();
      if (!main) return;
      syncingQty = true;
      main.value = value;
      main.dispatchEvent(new Event('change', { bubbles: true }));
      syncingQty = false;
      if (stickyQty) stickyQty.value = main.value;
    }

    function isDescriptionExpanded() {
      var root = descriptionRoot();
      if (!root) return false;
      var details = root.querySelector('details');
      if (details) return !!details.open;
      var header = root.querySelector('.product-accordion-tabs__header');
      if (header) return header.getAttribute('aria-expanded') === 'true';
      return false;
    }

    /** Description block has not fully scrolled above the viewport yet. */
    function isBeforeDescriptionEnd() {
      var root = descriptionRoot();
      if (!root) return false;
      return root.getBoundingClientRect().bottom > 80;
    }

    /** Primary CTA has scrolled above the fold (avoid showing sticky next to main button). */
    function hasScrolledPastSource() {
      if (!findSource()) return false;
      return sourceBtn.getBoundingClientRect().bottom < 8;
    }

    function shouldShowSticky() {
      return (
        mql.matches &&
        isDescriptionExpanded() &&
        isBeforeDescriptionEnd() &&
        hasScrolledPastSource()
      );
    }

    function updateVisibility() {
      setVisible(shouldShowSticky());
    }

    function bindObservers() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (descObserver) {
        descObserver.disconnect();
        descObserver = null;
      }
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('resize', updateVisibility);

      if (!mql.matches) {
        setVisible(false);
        return;
      }

      findSource();
      var desc = descriptionRoot();
      var details = descriptionDetails();

      observer = new IntersectionObserver(updateVisibility, {
        root: null,
        threshold: [0, 0.01, 1],
      });
      if (sourceBtn) observer.observe(sourceBtn);
      if (desc) {
        descObserver = new IntersectionObserver(updateVisibility, {
          root: null,
          threshold: [0, 0.01, 0.1, 1],
        });
        descObserver.observe(desc);
      }

      if (details && !details.dataset.stickyBound) {
        details.dataset.stickyBound = '1';
        if (details.tagName === 'DETAILS') {
          details.addEventListener('toggle', updateVisibility);
        }
      }

      window.__stickyAccordionChanged = updateVisibility;

      window.addEventListener('scroll', updateVisibility, { passive: true });
      window.addEventListener('resize', updateVisibility, { passive: true });
      updateVisibility();
    }

    stickyBtn.addEventListener('click', function () {
      if (!findSource()) return;
      if (sourceBtn.disabled) return;
      sourceBtn.click();
    });

    bar.addEventListener('click', function (event) {
      var btn = event.target.closest('.sticky-customize__value');
      if (!btn || !bar.contains(btn)) return;
      var name = btn.getAttribute('data-option-name');
      var value = btn.getAttribute('data-value');
      var root = variantRoot();
      if (!root) return;
      var input = root.querySelector(
        'input[type="radio"][name="' + CSS.escape(name) + '"][value="' + CSS.escape(value) + '"]'
      );
      if (!input || input.disabled || input.classList.contains('disabled')) return;
      input.click();
      window.setTimeout(syncFromMain, 50);
      window.setTimeout(syncFromMain, 250);
    });

    if (stickyQtyMinus) {
      stickyQtyMinus.addEventListener('click', function () {
        var main = mainQtyInput();
        if (!main) return;
        var minus = main.closest('quantity-input');
        if (minus) {
          var btn = minus.querySelector('button[name="minus"]');
          if (btn) btn.click();
        } else {
          var next = Math.max(parseInt(main.min || '1', 10), parseInt(main.value || '1', 10) - 1);
          writeQtyToMain(String(next));
        }
        window.setTimeout(syncQtyFromMain, 30);
      });
    }

    if (stickyQtyPlus) {
      stickyQtyPlus.addEventListener('click', function () {
        var main = mainQtyInput();
        if (!main) return;
        var wrap = main.closest('quantity-input');
        if (wrap) {
          var btn = wrap.querySelector('button[name="plus"]');
          if (btn) btn.click();
        } else {
          var next = parseInt(main.value || '1', 10) + 1;
          if (main.max) next = Math.min(parseInt(main.max, 10), next);
          writeQtyToMain(String(next));
        }
        window.setTimeout(syncQtyFromMain, 30);
      });
    }

    if (stickyQty) {
      stickyQty.addEventListener('change', function () {
        writeQtyToMain(stickyQty.value);
      });
    }

    var mainQty = mainQtyInput();
    if (mainQty) {
      mainQty.addEventListener('change', syncQtyFromMain);
      mainQty.addEventListener('input', syncQtyFromMain);
    }

    var root = variantRoot();
    if (root) {
      root.addEventListener('change', function () {
        window.setTimeout(syncFromMain, 30);
        window.setTimeout(syncFromMain, 200);
      });
    }

    var priceEl = mainPriceEl();
    if (priceEl && window.MutationObserver) {
      new MutationObserver(syncPrice).observe(priceEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    mql.addEventListener('change', bindObservers);

    bindObservers();
    var tries = 0;
    var findTimer = window.setInterval(function () {
      tries += 1;
      var prevMode = sourceMode;
      var found = findSource();
      if (found && (sourceMode !== prevMode || tries === 1)) {
        bindObservers();
      }
      if (descriptionRoot() && tries > 2) {
        bindObservers();
      }
      if (tries > 40) window.clearInterval(findTimer);
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
