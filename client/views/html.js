/* eslint-env browser */

export default function(discovery) {
    const buffer = document.createElement('div');

    discovery.view.define('html', function(el, config, data) {
        buffer.innerHTML = data;

        while (buffer.firstChild) {
            el.appendChild(buffer.firstChild);
        }
    }, {
        tag: null
    });
}
