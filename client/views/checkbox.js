/* eslint-env browser */

import defined from '../core/utils/defined.js';

export default function(discovery) {
    discovery.view.define('checkbox', function(el, config, data, context) {
        const { name, checked, readonly, content, onInit, onChange } = config;
        const inputEl = el.appendChild(document.createElement('input'));
        let renderContent = null;

        inputEl.type = 'checkbox';
        inputEl.checked = defined([discovery.queryBool(checked, data, context), context[name]], false);
        inputEl.readOnly = readonly;
        inputEl.addEventListener('click', (e) => {
            if (readonly) {
                e.preventDefault();
            }
        });
        inputEl.addEventListener('change', () => {
            if (typeof onChange === 'function') {
                onChange(inputEl.checked, name);

                if (renderContent !== null) {
                    renderContent();
                }
            }
        });

        if (typeof onInit === 'function') {
            onInit(inputEl.checked, name);
        }

        if (content) {
            const contentEl = el.appendChild(document.createElement('span'));
            renderContent = () => {
                const localContext = name ? Object.assign({}, context, { [name]: inputEl.checked }) : context;

                contentEl.innerHTML = '';
                discovery.view.render(contentEl, content, data, localContext);
            };

            renderContent();
        }
    }, {
        tag: 'label'
    });
}
