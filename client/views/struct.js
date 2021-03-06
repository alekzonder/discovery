/* eslint-env browser */

import { escapeHtml } from '../core/utils/html.js';

const hasOwnProperty = Object.prototype.hasOwnProperty;
const toString = Object.prototype.toString;
const collapseEl = document.createElement('span');
const LIST_ITEM_LIMIT = 50;
const ARRAY_ITEM_LIMIT = 4;
const OBJECT_KEYS_LIMIT = 4;

collapseEl.className = 'struct-collapse-value';

function token(type, str) {
    return `<span class="${type}">${str}</span>`;
}

function more(num) {
    return token('more', '…' + num + ' more…');
}

function value2htmlString(value, linear, deep) {
    switch (typeof value) {
        case 'boolean':
        case 'undefined':
            return token('keyword', value);

        case 'number':
        case 'bigint':
            return token('number', value);

        case 'string':
            return token('string', escapeHtml(JSON.stringify(value)));

        case 'symbol':
            return token('symbol', value);

        case 'function':
            return 'ƒn';

        case 'object': {
            if (value === null) {
                return token('keyword', 'null');
            }

            if (Array.isArray(value)) {
                const content = value.slice(0, ARRAY_ITEM_LIMIT).map(val => value2htmlString(val, !deep, deep)).join(', ');

                return (
                    '[' +
                        content +
                        (value.length > ARRAY_ITEM_LIMIT ? ', ' + more(value.length - ARRAY_ITEM_LIMIT) + ' ' : '') +
                    ']'
                );
            }

            // NOTE: constructor check and instanceof doesn't work here,
            // because value comes from sandbox
            if (toString.call(value) === '[object Date]') {
                return token('Date', value);
            }

            if (toString.call(value) === '[object RegExp]') {
                return token('RegExp', value);
            }

            if (!linear) {
                const res = [];
                let limit = OBJECT_KEYS_LIMIT;

                for (let key in value) {
                    if (hasOwnProperty.call(value, key)) {
                        if (limit > 0) {
                            res.push(token('property', key) + ': ' + value2htmlString(value[key], !deep, deep));
                        }

                        limit--;
                    }
                }

                if (limit < 0) {
                    res.push(more(Math.abs(limit)));
                }

                return res.length ? '{ ' + res.join(', ') + ' }' : '{}';
            } else {
                for (let key in value) {
                    if (hasOwnProperty.call(value, key)) {
                        return '{…}';
                    }
                }

                return '{}';
            }
        }

        default:
            return 'unknown type `' + (typeof value) + '`';
    }
}

function getValueType(value) {
    if (Array.isArray(value)) {
        return 'array';
    }

    if (value && toString.call(value) === '[object Object]') {
        return 'object';
    }

    return 'other';
}

function isValueExpandable(value) {
    const type = getValueType(value);

    return (
        (type === 'array' && value.length > 0) ||
        (type === 'object' && Object.keys(value).length > 0)
    );
}

function appendText(el, text) {
    el.appendChild(document.createTextNode(text));
}

export default function(discovery) {
    function maybeExpand(el, value) {
        if (isValueExpandable(value)) {
            el.classList.add('struct-expand-value');
            elementDataMap.set(el, value);
            return true;
        }
    }

    function collapseValue(el) {
        const data = elementDataMap.get(el);

        if (isValueExpandable(data)) {
            el.classList.add('struct-expand-value');
        }

        el.innerHTML = value2htmlString(data);
    }

    function expandValue(el, expandLimit) {
        const data = elementDataMap.get(el);

        el.classList.remove('struct-expand-value');

        switch (getValueType(data)) {
            case 'array':
                el.innerHTML = '';

                appendText(el, '[');
                el.appendChild(collapseEl.cloneNode(true));
                render(el, data, false, expandLimit, (key, value) =>
                    '<span class="value">' +
                        value2htmlString(value) +
                    '</span>'
                );
                appendText(el, ']');
                break;

            case 'object':
                el.innerHTML = '';

                appendText(el, '{');
                el.appendChild(collapseEl.cloneNode(true));
                render(el, data, true, expandLimit, (key, value) =>
                    '<span class="label">' +
                        '\xA0 \xA0 <span class="property">' + escapeHtml(key) + '</span>:\xA0' +
                    '</span>' +
                    '<span class="value">' + value2htmlString(value) + '</span>'
                );
                appendText(el, '}');
                break;
        }
    }

    function render(container, data, keys, expandLimit, fn) {
        discovery.view.render(container, {
            view: 'list',
            limit: LIST_ITEM_LIMIT,
            item: (el, config, key, { index, array }) => {
                const value = keys ? data[key] : key;

                el.className = 'entry-line';
                el.innerHTML = fn(keys ? key : index, value);

                if (maybeExpand(el.lastChild, value) && expandLimit > 1) {
                    expandValue(el.lastChild, expandLimit - 1);
                }

                if (index !== array.length - 1) {
                    el.appendChild(document.createTextNode(','));
                }
            }
        }, keys ? Object.keys(data) : data);
    }

    const elementDataMap = new WeakMap();
    const clickHandler = (e) => {
        let cursor = e.target;

        while (cursor && cursor.classList) {
            if (cursor.classList.contains('struct-expand-value')) {
                expandValue(cursor, 1);
                break;
            }

            if (cursor.classList.contains('struct-collapse-value')) {
                collapseValue(cursor.parentNode);
                break;
            }

            cursor = cursor.parentNode;
        }
    };

    // single event handler for all `struct` view instances
    document.addEventListener('click', clickHandler, false);

    discovery.view.define('struct', function(el, config, data) {
        const { expanded } = config;

        elementDataMap.set(el, data);

        if (expanded && isValueExpandable(data)) {
            expandValue(el, expanded);
        } else {
            collapseValue(el);
        }
    });

    return () => {
        document.removeEventListener('click', clickHandler, false);
    };
}
