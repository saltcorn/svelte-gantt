(function (exports) {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
            'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        const crossorigin = is_crossorigin();
        let unsubscribe;
        if (crossorigin) {
            iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            if (crossorigin) {
                unsubscribe();
            }
            else if (unsubscribe && iframe.contentWindow) {
                unsubscribe();
            }
            detach(iframe);
        };
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }
    class HtmlTag {
        constructor(is_svg = false) {
            this.is_svg = false;
            this.is_svg = is_svg;
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                if (this.is_svg)
                    this.e = svg_element(target.nodeName);
                else
                    this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }
    function construct_svelte_component(component, props) {
        return new component(props);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    /**
     * Associates an arbitrary `context` object with the current component and the specified `key`
     * and returns that object. The context is then available to children of the component
     * (including slotted content) with `getContext`.
     *
     * Like lifecycle functions, this must be called during component initialisation.
     *
     * https://svelte.dev/docs#run-time-svelte-setcontext
     */
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
        return context;
    }
    /**
     * Retrieves the context that belongs to the closest parent component with the specified `key`.
     * Must be called during component initialisation.
     *
     * https://svelte.dev/docs#run-time-svelte-getcontext
     */
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }

    function createEntityStore() {
        const { subscribe, set, update } = writable({ ids: [], entities: {} });
        return {
            set,
            _update: update,
            subscribe,
            add: (item) => update(({ ids, entities }) => ({
                ids: [...ids, item.model.id],
                entities: Object.assign(Object.assign({}, entities), { [item.model.id]: item })
            })),
            delete: (id) => update(state => {
                const _a = state.entities, _b = id; _a[_b]; const entities = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
                return {
                    ids: state.ids.filter(i => i !== id),
                    entities
                };
            }),
            deleteAll: (ids) => update(state => {
                const entities = Object.assign({}, state.entities);
                const idSet = new Set(ids);
                for (let i = 0; i < state.ids.length; i++) {
                    if (idSet.has(state.ids[i])) {
                        delete entities[state.ids[i]];
                    }
                }
                return {
                    ids: state.ids.filter(i => !idSet.has(i)),
                    entities
                };
            }),
            update: (item) => update(({ ids, entities }) => ({
                ids,
                entities: Object.assign(Object.assign({}, entities), { [item.model.id]: item })
            })),
            upsert: (item) => update(({ ids, entities }) => {
                const hasIndex = ids.indexOf(item.model.id) !== -1;
                return {
                    ids: hasIndex ? ids : [...ids, item.model.id],
                    entities: Object.assign(Object.assign({}, entities), { [item.model.id]: item })
                };
            }),
            upsertAll: (items) => update(state => {
                const entities = Object.assign({}, state.entities);
                const ids = [...state.ids];
                for (let i = 0; i < items.length; i++) {
                    if (ids.indexOf(items[i].model.id) === -1) {
                        ids.push(items[i].model.id);
                    }
                    entities[items[i].model.id] = items[i];
                }
                return {
                    ids,
                    entities
                };
            }),
            addAll: (items) => {
                const ids = [];
                const entities = {};
                for (let i = 0; i < items.length; i++) {
                    ids.push(items[i].model.id);
                    entities[items[i].model.id] = items[i];
                }
                set({ ids, entities });
            },
            refresh: () => update(store => (Object.assign({}, store)))
        };
    }
    const taskStore = createEntityStore();
    const rowStore = createEntityStore();
    const timeRangeStore = createEntityStore();
    const allTasks = all(taskStore);
    const allRows = all(rowStore);
    const allTimeRanges = all(timeRangeStore);
    const rowTaskCache = derived(allTasks, $allTasks => {
        const cache = {};
        for (let i = 0; i < $allTasks.length; i++) {
            const task = $allTasks[i];
            if (!cache[task.model.resourceId]) {
                cache[task.model.resourceId] = [];
            }
            cache[task.model.resourceId].push(task.model.id);
        }
        return cache;
    });
    function all(store) {
        return derived(store, ({ ids, entities }) => {
            const results = [];
            for (let i = 0; i < ids.length; i++) {
                results.push(entities[ids[i]]);
            }
            return results;
        });
    }

    class TaskFactory {
        constructor(columnService) {
            this.columnService = columnService;
        }
        createTask(model) {
            // id of task, every task needs to have a unique one
            //task.id = task.id || undefined;
            // completion %, indicated on task
            model.amountDone = model.amountDone || 0;
            // css classes
            model.classes = model.classes || '';
            // date task starts on
            model.from = model.from || null;
            // date task ends on
            model.to = model.to || null;
            // label of task
            model.label = model.label || undefined;
            // html content of task, will override label
            model.html = model.html || undefined;
            // show button bar
            model.showButton = model.showButton || false;
            // button classes, useful for fontawesome icons
            model.buttonClasses = model.buttonClasses || '';
            // html content of button
            model.buttonHtml = model.buttonHtml || '';
            // enable dragging of task
            model.enableDragging = model.enableDragging === undefined ? true : model.enableDragging;
            const left = this.columnService.getPositionByDate(model.from) | 0;
            const right = this.columnService.getPositionByDate(model.to) | 0;
            return {
                model,
                left: left,
                width: right - left,
                height: this.getHeight(model),
                top: this.getPosY(model),
                reflections: []
            };
        }
        createTasks(tasks) {
            return tasks.map(task => this.createTask(task));
        }
        row(resourceId) {
            return this.rowEntities[resourceId];
        }
        getHeight(model) {
            return this.row(model.resourceId).height - 2 * this.rowPadding;
        }
        getPosY(model) {
            return this.row(model.resourceId).y + this.rowPadding;
        }
    }
    function reflectTask(task, row, options) {
        const reflectedId = `reflected-task-${task.model.id}-${row.model.id}`;
        const model = Object.assign(Object.assign({}, task.model), { resourceId: row.model.id, id: reflectedId, enableDragging: false });
        return Object.assign(Object.assign({}, task), { model, top: row.y + options.rowPadding, reflected: true, reflectedOnParent: false, reflectedOnChild: true, originalId: task.model.id });
    }

    function isLeftClick(event) {
        return event.which === 1;
    }
    /**
     * Gets mouse position within an element
     * @param node
     * @param event
     */
    function getRelativePos(node, event) {
        const rect = node.getBoundingClientRect();
        const x = event.clientX - rect.left; //x position within the element.
        const y = event.clientY - rect.top; //y position within the element.
        return {
            x: x,
            y: y
        };
    }
    /**
     * Adds an event listener that triggers once.
     * @param target
     * @param type
     * @param listener
     * @param addOptions
     * @param removeOptions
     */
    function addEventListenerOnce(target, type, listener, addOptions, removeOptions) {
        target.addEventListener(type, function fn(event) {
            target.removeEventListener(type, fn, removeOptions);
            listener.apply(this, arguments, addOptions);
        });
    }
    /**
     * Sets the cursor on an element. Globally by default.
     * @param cursor
     * @param node
     */
    function setCursor(cursor, node = document.body) {
        node.style.cursor = cursor;
    }

    const MIN_DRAG_X = 2;
    const MIN_DRAG_Y = 2;

    /**
     * Applies dragging interaction to gantt elements
     */
    class Draggable {
        constructor(node, settings, offsetData) {
            this.dragging = false;
            this.resizing = false;
            this.resizeTriggered = false;
            this.offsetPos = { x: null, y: null };
            this.offsetWidth = null;
            this.onmousedown = (event) => {
                const offsetEvent = { clientX: this.offsetPos.x + event.clientX, clientY: this.offsetPos.y + event.clientY };
                if (!isLeftClick(event) && !this.settings.modelId) {
                    return;
                }
                if (!this.settings.modelId) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                const canDrag = this.dragAllowed;
                const canResize = this.resizeAllowed;
                if (canDrag || canResize) {
                    const x = this.settings.getX();
                    const y = this.settings.getY();
                    const width = this.settings.getWidth();
                    this.initialX = offsetEvent.clientX;
                    this.initialY = offsetEvent.clientY;
                    this.mouseStartRight = x + width;
                    this.mouseStartPosX = getRelativePos(this.settings.container, offsetEvent).x - x;
                    this.mouseStartPosY = getRelativePos(this.settings.container, offsetEvent).y - y;
                    if (canResize && this.mouseStartPosX <= this.settings.resizeHandleWidth) {
                        this.direction = 'left';
                        this.resizing = true;
                    }
                    if (canResize && this.mouseStartPosX >= width - this.offsetWidth - this.settings.resizeHandleWidth) {
                        this.direction = 'right';
                        this.resizing = true;
                    }
                    if (canDrag && !this.resizing) {
                        this.dragging = true;
                    }
                    if ((this.dragging || this.resizing) && this.settings.onDown) {
                        this.settings.onDown({
                            mouseEvent: offsetEvent,
                            x,
                            width,
                            y,
                            resizing: this.resizing,
                            dragging: this.dragging,
                        });
                    }
                    if (!this.settings.modelId) {
                        window.addEventListener('mousemove', this.onmousemove, false);
                        addEventListenerOnce(window, 'mouseup', this.onmouseup);
                    }
                }
            };
            this.onmousemove = (event) => {
                const offsetEvent = { clientX: this.offsetPos.x + event.clientX, clientY: this.offsetPos.y + event.clientY };
                if (!this.resizeTriggered) {
                    if (Math.abs(offsetEvent.clientX - this.initialX) > MIN_DRAG_X
                        || Math.abs(offsetEvent.clientY - this.initialY) > MIN_DRAG_Y) {
                        this.resizeTriggered = true;
                    }
                    else {
                        return;
                    }
                }
                event.preventDefault();
                if (this.resizing) {
                    const mousePos = getRelativePos(this.settings.container, offsetEvent);
                    const x = this.settings.getX();
                    const width = this.settings.getWidth();
                    let resultX;
                    let resultWidth;
                    if (this.direction === 'left') { //resize left
                        if (this.overRezisedOffset === 'left') {
                            mousePos.x += this.offsetWidth;
                        }
                        if ((this.mouseStartRight - mousePos.x) <= 0) {
                            this.direction = 'right';
                            if (this.overRezisedOffset !== 'left') {
                                this.overRezisedOffset = 'right';
                            }
                            else {
                                this.overRezisedOffset = undefined;
                            }
                            resultX = this.mouseStartRight;
                            resultWidth = this.mouseStartRight - mousePos.x;
                            this.mouseStartRight = this.mouseStartRight + width;
                        }
                        else {
                            resultX = mousePos.x;
                            resultWidth = this.mouseStartRight - mousePos.x;
                        }
                    }
                    else if (this.direction === 'right') { //resize right
                        if (this.overRezisedOffset === 'right') {
                            mousePos.x -= this.offsetWidth;
                        }
                        if ((mousePos.x - x + this.offsetWidth) <= 0) {
                            this.direction = 'left';
                            if (this.overRezisedOffset !== 'right') {
                                this.overRezisedOffset = 'left';
                            }
                            else {
                                this.overRezisedOffset = undefined;
                            }
                            resultX = mousePos.x + this.offsetWidth;
                            resultWidth = mousePos.x - x + this.offsetWidth;
                            this.mouseStartRight = x;
                        }
                        else {
                            resultX = x;
                            resultWidth = mousePos.x - x + this.offsetWidth;
                        }
                    }
                    this.settings.onResize && this.settings.onResize({
                        x: resultX,
                        width: resultWidth
                    });
                }
                // mouseup
                if (this.dragging && this.settings.onDrag) {
                    const mousePos = getRelativePos(this.settings.container, offsetEvent);
                    this.settings.onDrag({
                        x: mousePos.x - this.mouseStartPosX,
                        y: mousePos.y - this.mouseStartPosY
                    });
                }
            };
            this.onmouseup = (event) => {
                const offsetEvent = { clientX: this.offsetPos.x + event.clientX, clientY: this.offsetPos.y + event.clientY };
                const x = this.settings.getX();
                const y = this.settings.getY();
                const width = this.settings.getWidth();
                this.settings.onMouseUp && this.settings.onMouseUp();
                if (this.resizeTriggered && this.settings.onDrop) {
                    this.settings.onDrop({
                        mouseEvent: offsetEvent,
                        x,
                        y,
                        width,
                        dragging: this.dragging,
                        resizing: this.resizing
                    });
                }
                this.mouseStartPosX = null;
                this.mouseStartPosY = null;
                this.mouseStartRight = null;
                this.dragging = false;
                this.resizing = false;
                this.initialX = null;
                this.initialY = null;
                this.initialW = null;
                this.resizeTriggered = false;
                this.offsetPos = { x: null, y: null };
                this.offsetWidth = null;
                this.overRezisedOffset = undefined;
                if (!this.settings.modelId)
                    window.removeEventListener('mousemove', this.onmousemove, false);
            };
            this.settings = settings;
            this.node = node;
            if (this.settings.modelId) {
                this.offsetPos = offsetData.offsetPos;
                this.offsetWidth = offsetData.offsetWidth;
            }
            else {
                node.addEventListener('mousedown', this.onmousedown, { passive: true });
            }
        }
        get dragAllowed() {
            if (typeof (this.settings.dragAllowed) === 'function') {
                return this.settings.dragAllowed();
            }
            else {
                return this.settings.dragAllowed;
            }
        }
        get resizeAllowed() {
            if (typeof (this.settings.resizeAllowed) === 'function') {
                return this.settings.resizeAllowed();
            }
            else {
                return this.settings.resizeAllowed;
            }
        }
        destroy() {
            this.node.removeEventListener('mousedown', this.onmousedown, false);
            this.node.removeEventListener('mousemove', this.onmousemove, false);
            this.node.removeEventListener('mouseup', this.onmouseup, false);
        }
    }

    class DragDropManager {
        constructor(rowStore) {
            this.handlerMap = {};
            this.register('row', (event) => {
                let elements = document.elementsFromPoint(event.clientX, event.clientY);
                let rowElement = elements.find((element) => !!element.getAttribute('data-row-id'));
                if (rowElement !== undefined) {
                    const rowId = rowElement.getAttribute('data-row-id');
                    const { entities } = get_store_value(rowStore);
                    const targetRow = entities[rowId];
                    if (targetRow.model.enableDragging) {
                        return targetRow;
                    }
                }
                return null;
            });
        }
        register(target, handler) {
            this.handlerMap[target] = handler;
        }
        getTarget(target, event) {
            var handler = this.handlerMap[target];
            if (handler) {
                return handler(event);
            }
        }
    }

    function styleInject(css, ref) {
      if ( ref === void 0 ) ref = {};
      var insertAt = ref.insertAt;

      if (!css || typeof document === 'undefined') { return; }

      var head = document.head || document.getElementsByTagName('head')[0];
      var style = document.createElement('style');
      style.type = 'text/css';

      if (insertAt === 'top') {
        if (head.firstChild) {
          head.insertBefore(style, head.firstChild);
        } else {
          head.appendChild(style);
        }
      } else {
        head.appendChild(style);
      }

      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
    }

    var css_248z$f = ".sg-label-bottom.svelte-lhco0r{position:absolute;top:calc(100% + 10px);color:#888}.debug.svelte-lhco0r{position:absolute;top:-10px;right:0;font-size:8px;color:black}.sg-task.svelte-lhco0r{position:absolute;border-radius:2px;white-space:nowrap;transition:background-color 0.2s, opacity 0.2s;pointer-events:all}.sg-task{background:rgb(116, 191, 255)}.sg-task-background.svelte-lhco0r{position:absolute;height:100%;top:0}.sg-task-content.svelte-lhco0r{position:absolute;height:100%;top:0;padding-left:14px;font-size:14px;display:flex;align-items:center;justify-content:flex-start;user-select:none}.sg-task.svelte-lhco0r:not(.moving){transition:transform 0.2s, background-color 0.2s, width 0.2s}.sg-task.moving.svelte-lhco0r{z-index:10000;opacity:0.5}.sg-task.dragging-enabled.svelte-lhco0r:hover::before{content:\"\";width:4px;height:50%;top:25%;position:absolute;border-style:solid;border-color:rgba(255, 255, 255, 0.5);cursor:ew-resize;margin-left:3px;left:0;border-width:0 1px;z-index:1}.sg-task.dragging-enabled.svelte-lhco0r:hover::after{content:\"\";width:4px;height:50%;top:25%;position:absolute;border-style:solid;border-color:rgba(255, 255, 255, 0.5);cursor:ew-resize;margin-right:3px;right:0;border-width:0 1px;z-index:1}.sg-task-reflected.svelte-lhco0r{opacity:0.5}.sg-task-background.svelte-lhco0r{background:rgba(0, 0, 0, 0.2)}.sg-task{color:white;background:rgb(116, 191, 255)}.sg-task:hover{background:rgb(98, 161, 216)}.sg-task.selected{background:rgb(69, 112, 150)}";
    styleInject(css_248z$f);

    /* src/entities/Task.svelte generated by Svelte v3.55.0 */

    function create_if_block_4$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "sg-task-background svelte-lhco0r");
    			set_style(div, "width", /*model*/ ctx[0].amountDone + "%");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*model*/ 1) {
    				set_style(div, "width", /*model*/ ctx[0].amountDone + "%");
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (385:8) {:else}
    function create_else_block$2(ctx) {
    	let t_value = /*model*/ ctx[0].label + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*model*/ 1 && t_value !== (t_value = /*model*/ ctx[0].label + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (383:30) 
    function create_if_block_3$1(ctx) {
    	let html_tag;
    	let raw_value = /*taskContent*/ ctx[8](/*model*/ ctx[0]) + "";
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*model*/ 1 && raw_value !== (raw_value = /*taskContent*/ ctx[8](/*model*/ ctx[0]) + "")) html_tag.p(raw_value);
    		},
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    // (381:8) {#if model.html}
    function create_if_block_2$1(ctx) {
    	let html_tag;
    	let raw_value = /*model*/ ctx[0].html + "";
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*model*/ 1 && raw_value !== (raw_value = /*model*/ ctx[0].html + "")) html_tag.p(raw_value);
    		},
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    // (387:8) {#if model.showButton}
    function create_if_block_1$2(ctx) {
    	let span;
    	let raw_value = /*model*/ ctx[0].buttonHtml + "";
    	let span_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			attr(span, "class", span_class_value = "sg-task-button " + /*model*/ ctx[0].buttonClasses + " svelte-lhco0r");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			span.innerHTML = raw_value;

    			if (!mounted) {
    				dispose = listen(span, "click", /*onclick*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*model*/ 1 && raw_value !== (raw_value = /*model*/ ctx[0].buttonHtml + "")) span.innerHTML = raw_value;
    			if (dirty & /*model*/ 1 && span_class_value !== (span_class_value = "sg-task-button " + /*model*/ ctx[0].buttonClasses + " svelte-lhco0r")) {
    				attr(span, "class", span_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (395:6) {#if model.labelBottom}
    function create_if_block$5(ctx) {
    	let label;
    	let t_value = /*model*/ ctx[0].labelBottom + "";
    	let t;

    	return {
    		c() {
    			label = element("label");
    			t = text(t_value);
    			attr(label, "class", "sg-label-bottom svelte-lhco0r");
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*model*/ 1 && t_value !== (t_value = /*model*/ ctx[0].labelBottom + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(label);
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let t1;
    	let t2;
    	let div1_data_task_id_value;
    	let div1_class_value;
    	let taskElement_action;
    	let mounted;
    	let dispose;
    	let if_block0 = /*model*/ ctx[0].amountDone && create_if_block_4$1(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*model*/ ctx[0].html) return create_if_block_2$1;
    		if (/*taskContent*/ ctx[8]) return create_if_block_3$1;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);
    	let if_block2 = /*model*/ ctx[0].showButton && create_if_block_1$2(ctx);
    	let if_block3 = /*model*/ ctx[0].labelBottom && create_if_block$5(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div0 = element("div");
    			if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			attr(div0, "class", "sg-task-content svelte-lhco0r");
    			attr(div1, "data-task-id", div1_data_task_id_value = /*model*/ ctx[0].id);
    			attr(div1, "class", div1_class_value = "sg-task " + /*model*/ ctx[0].classes + " svelte-lhco0r");
    			set_style(div1, "width", /*_position*/ ctx[6].width + "px");
    			set_style(div1, "height", /*height*/ ctx[1] + "px");
    			set_style(div1, "transform", "translate(" + /*_position*/ ctx[6].x + "px, " + /*_position*/ ctx[6].y + "px)");
    			toggle_class(div1, "moving", /*_dragging*/ ctx[4] || /*_resizing*/ ctx[5]);
    			toggle_class(div1, "animating", animating);
    			toggle_class(div1, "sg-task-reflected", /*reflected*/ ctx[2]);
    			toggle_class(div1, "dragging-enabled", /*$rowStore*/ ctx[7].entities[/*model*/ ctx[0].resourceId].model.enableDragging && /*model*/ ctx[0].enableDragging);
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			if (if_block0) if_block0.m(div1, null);
    			append(div1, t0);
    			append(div1, div0);
    			if_block1.m(div0, null);
    			append(div0, t1);
    			if (if_block2) if_block2.m(div0, null);
    			append(div1, t2);
    			if (if_block3) if_block3.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen(div1, "dblclick", /*dblclick_handler*/ ctx[16]),
    					action_destroyer(/*drag*/ ctx[11].call(null, div1)),
    					action_destroyer(taskElement_action = /*taskElement*/ ctx[12].call(null, div1, /*model*/ ctx[0]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*model*/ ctx[0].amountDone) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$1(ctx);
    					if_block0.c();
    					if_block0.m(div1, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div0, t1);
    				}
    			}

    			if (/*model*/ ctx[0].showButton) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$2(ctx);
    					if_block2.c();
    					if_block2.m(div0, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*model*/ ctx[0].labelBottom) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block$5(ctx);
    					if_block3.c();
    					if_block3.m(div1, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty & /*model*/ 1 && div1_data_task_id_value !== (div1_data_task_id_value = /*model*/ ctx[0].id)) {
    				attr(div1, "data-task-id", div1_data_task_id_value);
    			}

    			if (dirty & /*model*/ 1 && div1_class_value !== (div1_class_value = "sg-task " + /*model*/ ctx[0].classes + " svelte-lhco0r")) {
    				attr(div1, "class", div1_class_value);
    			}

    			if (dirty & /*_position*/ 64) {
    				set_style(div1, "width", /*_position*/ ctx[6].width + "px");
    			}

    			if (dirty & /*height*/ 2) {
    				set_style(div1, "height", /*height*/ ctx[1] + "px");
    			}

    			if (dirty & /*_position*/ 64) {
    				set_style(div1, "transform", "translate(" + /*_position*/ ctx[6].x + "px, " + /*_position*/ ctx[6].y + "px)");
    			}

    			if (taskElement_action && is_function(taskElement_action.update) && dirty & /*model*/ 1) taskElement_action.update.call(null, /*model*/ ctx[0]);

    			if (dirty & /*model, _dragging, _resizing*/ 49) {
    				toggle_class(div1, "moving", /*_dragging*/ ctx[4] || /*_resizing*/ ctx[5]);
    			}

    			if (dirty & /*model, animating*/ 1) {
    				toggle_class(div1, "animating", animating);
    			}

    			if (dirty & /*model, reflected*/ 5) {
    				toggle_class(div1, "sg-task-reflected", /*reflected*/ ctx[2]);
    			}

    			if (dirty & /*model, $rowStore, model*/ 129) {
    				toggle_class(div1, "dragging-enabled", /*$rowStore*/ ctx[7].entities[/*model*/ ctx[0].resourceId].model.enableDragging && /*model*/ ctx[0].enableDragging);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    const tasksSettings = new Map();
    const currentSelection = new Map();
    const oldReflections = [];
    const newTasksAndReflections = [];

    class SelectionManager {
    	constructor() {
    		this.dragOrResizeTriggered = event => {
    			for (let [selId, selectedItem] of currentSelection.entries()) {
    				const draggable = new Draggable(selectedItem.HTMLElement, tasksSettings.get(selId), selectedItem.offsetData);
    				draggable.onmousedown(event);
    				currentSelection.set(selId, Object.assign(Object.assign({}, selectedItem), { draggable }));
    			}

    			window.addEventListener('mousemove', this.selectionDragOrResizing, false);
    			addEventListenerOnce(window, 'mouseup', this.selectionDropped);
    		};

    		this.selectionDragOrResizing = event => {
    			for (let [,selectedItem] of currentSelection.entries()) {
    				const { draggable } = selectedItem;
    				draggable.onmousemove(event);
    			}
    		};

    		this.selectionDropped = event => {
    			window.removeEventListener('mousemove', this.selectionDragOrResizing, false);

    			for (const [,selectedItem] of currentSelection.entries()) {
    				const { draggable } = selectedItem;
    				draggable.onmouseup(event);
    			}

    			if (oldReflections.length) taskStore.deleteAll(oldReflections);
    			if (newTasksAndReflections.length) taskStore.upsertAll(newTasksAndReflections);
    			console.log('%cTASK SVELTE UPDATE', 'background:black; color:white;');
    			newTasksAndReflections.length = 0;
    			oldReflections.length = 0;
    		};
    	}

    	selectSingle(taskId, node) {
    		if (!currentSelection.has(taskId)) {
    			this.unSelectTasks();
    			this.toggleSelection(taskId, node);
    		}
    	}

    	toggleSelection(taskId, node) {
    		currentSelection.set(taskId, {
    			HTMLElement: node,
    			offsetData: undefined,
    			draggable: undefined
    		});
    	}

    	unSelectTasks() {
    		for (const [,selectedItems] of currentSelection.entries()) {
    			selectedItems.HTMLElement.classList.remove('sg-task-selected');
    		}

    		currentSelection.clear();
    	}

    	dispatchSelectionEvent(taskId, event) {
    		const x = tasksSettings.get(taskId).getX();
    		const y = tasksSettings.get(taskId).getY();
    		const width = tasksSettings.get(taskId).getWidth();

    		for (const [selId, selectedItem] of currentSelection.entries()) {
    			selectedItem.HTMLElement.classList.add('sg-task-selected');

    			if (selId !== taskId) {
    				selectedItem.offsetData = {
    					offsetPos: {
    						x: tasksSettings.get(selId).getX() - x,
    						y: tasksSettings.get(selId).getY() - y
    					},
    					offsetWidth: tasksSettings.get(selId).getWidth() - width
    				};
    			} else {
    				selectedItem.offsetData = {
    					offsetPos: { x: null, y: null },
    					offsetWidth: null
    				};
    			}
    		}

    		this.dragOrResizeTriggered(event);
    	}
    }

    let animating = true;

    function instance$d($$self, $$props, $$invalidate) {
    	let $rowPadding;
    	let $rowStore;
    	let $taskStore;
    	component_subscribe($$self, rowStore, $$value => $$invalidate(7, $rowStore = $$value));
    	component_subscribe($$self, taskStore, $$value => $$invalidate(18, $taskStore = $$value));
    	let { model } = $$props;
    	let { height } = $$props;
    	let { left } = $$props;
    	let { top } = $$props;
    	let { width } = $$props;
    	let { reflected = false } = $$props;
    	let _dragging = false;
    	let _resizing = false;
    	let _position = { x: left, y: top, width };

    	function updatePosition(x, y, width) {
    		if (!_dragging && !_resizing) {
    			$$invalidate(6, _position.x = x, _position);
    			$$invalidate(6, _position.y = y, _position);
    			$$invalidate(6, _position.width = width, _position);
    		} // should NOT animate on resize/update of columns
    	}

    	const { rowContainer } = getContext('gantt');
    	const { taskContent, resizeHandleWidth, rowPadding, onTaskButtonClick, reflectOnParentRows, reflectOnChildRows, taskElementHook } = getContext('options');
    	component_subscribe($$self, rowPadding, value => $$invalidate(17, $rowPadding = value));
    	const { dndManager, api, utils, columnService } = getContext('services');

    	function drag(node) {
    		const ondrop = event => {
    			let rowChangeValid = true;

    			//row switching
    			const sourceRow = $rowStore.entities[model.resourceId];

    			if (event.dragging) {
    				const targetRow = dndManager.getTarget("row", event.mouseEvent);

    				if (targetRow) {
    					$$invalidate(0, model.resourceId = targetRow.model.id, model);
    					api.tasks.raise.switchRow(this, targetRow, sourceRow);
    				} else {
    					rowChangeValid = false;
    				}
    			}

    			$$invalidate(4, _dragging = $$invalidate(5, _resizing = false));
    			const task = $taskStore.entities[model.id];

    			if (rowChangeValid) {
    				const prevFrom = model.from;
    				const prevTo = model.to;
    				const newFrom = $$invalidate(0, model.from = utils.roundTo(columnService.getDateByPosition(event.x)), model);
    				const newTo = $$invalidate(0, model.to = utils.roundTo(columnService.getDateByPosition(event.x + event.width)), model);
    				const newLeft = columnService.getPositionByDate(newFrom) | 0;
    				const newRight = columnService.getPositionByDate(newTo) | 0;
    				const targetRow = $rowStore.entities[model.resourceId];
    				const left = newLeft;
    				const width = newRight - newLeft;
    				const top = $rowPadding + targetRow.y;
    				updatePosition(left, top, width);
    				const newTask = Object.assign(Object.assign({}, task), { left, width, top, model });
    				const changed = prevFrom != newFrom || prevTo != newTo || sourceRow && sourceRow.model.id !== targetRow.model.id;

    				if (changed) {
    					api.tasks.raise.change({ task: newTask, sourceRow, targetRow });
    				}

    				newTasksAndReflections.push(newTask);

    				if (changed) {
    					api.tasks.raise.changed({ task: newTask, sourceRow, targetRow });
    				}

    				// update shadow tasks
    				if (newTask.reflections) {
    					oldReflections.push(...newTask.reflections);
    				}

    				const reflectedTasks = [];

    				if (reflectOnChildRows && targetRow.allChildren) {
    					if (!newTask.reflections) newTask.reflections = [];
    					const opts = { rowPadding: $rowPadding };

    					targetRow.allChildren.forEach(r => {
    						const reflectedTask = reflectTask(newTask, r, opts);
    						newTask.reflections.push(reflectedTask.model.id);
    						reflectedTasks.push(reflectedTask);
    					});
    				}

    				if (reflectOnParentRows && targetRow.allParents.length > 0) {
    					if (!newTask.reflections) newTask.reflections = [];
    					const opts = { rowPadding: $rowPadding };

    					targetRow.allParents.forEach(r => {
    						const reflectedTask = reflectTask(newTask, r, opts);
    						newTask.reflections.push(reflectedTask.model.id);
    						reflectedTasks.push(reflectedTask);
    					});
    				}

    				if (reflectedTasks.length > 0) {
    					newTasksAndReflections.push(...reflectedTasks);
    				}

    				if (!(targetRow.allParents.length > 0) && !targetRow.allChildren) {
    					newTask.reflections = null;
    				}
    			} else {
    				// reset position
    				($$invalidate(6, _position.x = task.left, _position), $$invalidate(6, _position.width = task.width, _position), $$invalidate(6, _position.y = task.top, _position));
    			}
    		};

    		const ondrag = event => {
    			($$invalidate(6, _position.x = event.x, _position), $$invalidate(6, _position.y = event.y, _position), $$invalidate(4, _dragging = true));
    			api.tasks.raise.move(model);
    		};

    		const onmouseup = () => {
    			setCursor("default");
    			api.tasks.raise.moveEnd(model);
    		};

    		if (!reflected) {
    			// reflected tasks must not be resized or dragged
    			tasksSettings.set(model.id, {
    				onDown: event => {
    					console.log('EVENT ON DOWN DRAGGABLE TASK', event);

    					if (event.dragging) {
    						setCursor("move");
    					}

    					if (event.resizing) {
    						setCursor("e-resize");
    					}
    				},
    				// onMouseUp: () => {
    				//     setCursor("default");
    				// },
    				onMouseUp: onmouseup,
    				onResize: event => {
    					($$invalidate(6, _position.x = event.x, _position), $$invalidate(6, _position.width = event.width, _position), $$invalidate(5, _resizing = true));
    				},
    				// onDrag: (event) => {
    				//     (_position.x = event.x), (_position.y = event.y), (_dragging = true);
    				// },
    				onDrag: ondrag,
    				dragAllowed: () => {
    					return get_store_value(rowStore).entities[model.resourceId].model.enableDragging && model.enableDragging;
    				},
    				resizeAllowed: () => {
    					return get_store_value(rowStore).entities[model.resourceId].model.enableDragging && model.enableDragging;
    				},
    				onDrop: ondrop,
    				container: rowContainer,
    				resizeHandleWidth,
    				getX: () => _position.x,
    				getY: () => _position.y,
    				getWidth: () => _position.width,
    				modelId: model.id
    			});

    			return {
    				destroy: () => tasksSettings.delete(model.id)
    			};
    		}
    	}

    	function taskElement(node, model) {
    		if (node && node.getBoundingClientRect().x == 0 && node.getBoundingClientRect().width == 0) {
    			node = document.querySelector('[data-task-id="' + node.dataset.taskId + '"]');
    			console.log('NODE AFTER', node, node.getBoundingClientRect());
    		}

    		if (taskElementHook) {
    			return taskElementHook(node, model);
    		}
    	}

    	function onclick(event) {
    		if (onTaskButtonClick) {
    			onTaskButtonClick(model);
    		}
    	}

    	const dblclick_handler = () => {
    		api.tasks.raise.dblclicked(model);
    	};

    	$$self.$$set = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    		if ('height' in $$props) $$invalidate(1, height = $$props.height);
    		if ('left' in $$props) $$invalidate(13, left = $$props.left);
    		if ('top' in $$props) $$invalidate(14, top = $$props.top);
    		if ('width' in $$props) $$invalidate(15, width = $$props.width);
    		if ('reflected' in $$props) $$invalidate(2, reflected = $$props.reflected);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*left, top, width*/ 57344) {
    			updatePosition(left, top, width);
    		}
    	};

    	return [
    		model,
    		height,
    		reflected,
    		onclick,
    		_dragging,
    		_resizing,
    		_position,
    		$rowStore,
    		taskContent,
    		rowPadding,
    		api,
    		drag,
    		taskElement,
    		left,
    		top,
    		width,
    		dblclick_handler
    	];
    }

    class Task extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {
    			model: 0,
    			height: 1,
    			left: 13,
    			top: 14,
    			width: 15,
    			reflected: 2,
    			onclick: 3
    		});
    	}

    	get onclick() {
    		return this.$$.ctx[3];
    	}
    }

    var css_248z$e = ".sg-row.svelte-7u5y5s{position:relative;width:100%;box-sizing:border-box}";
    styleInject(css_248z$e);

    /* src/entities/Row.svelte generated by Svelte v3.55.0 */

    function create_if_block$4(ctx) {
    	let html_tag;
    	let raw_value = /*row*/ ctx[0].model.contentHtml + "";
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*row*/ 1 && raw_value !== (raw_value = /*row*/ ctx[0].model.contentHtml + "")) html_tag.p(raw_value);
    		},
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    function create_fragment$c(ctx) {
    	let div;
    	let div_class_value;
    	let div_data_row_id_value;
    	let if_block = /*row*/ ctx[0].model.contentHtml && create_if_block$4(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr(div, "class", div_class_value = "sg-row " + /*row*/ ctx[0].model.classes + " svelte-7u5y5s");
    			attr(div, "data-row-id", div_data_row_id_value = /*row*/ ctx[0].model.id);
    			set_style(div, "height", /*$rowHeight*/ ctx[3] + "px");
    			toggle_class(div, "sg-hover", /*$hoveredRow*/ ctx[1] == /*row*/ ctx[0].model.id);
    			toggle_class(div, "sg-selected", /*$selectedRow*/ ctx[2] == /*row*/ ctx[0].model.id);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},
    		p(ctx, [dirty]) {
    			if (/*row*/ ctx[0].model.contentHtml) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*row*/ 1 && div_class_value !== (div_class_value = "sg-row " + /*row*/ ctx[0].model.classes + " svelte-7u5y5s")) {
    				attr(div, "class", div_class_value);
    			}

    			if (dirty & /*row*/ 1 && div_data_row_id_value !== (div_data_row_id_value = /*row*/ ctx[0].model.id)) {
    				attr(div, "data-row-id", div_data_row_id_value);
    			}

    			if (dirty & /*$rowHeight*/ 8) {
    				set_style(div, "height", /*$rowHeight*/ ctx[3] + "px");
    			}

    			if (dirty & /*row, $hoveredRow, row*/ 3) {
    				toggle_class(div, "sg-hover", /*$hoveredRow*/ ctx[1] == /*row*/ ctx[0].model.id);
    			}

    			if (dirty & /*row, $selectedRow, row*/ 5) {
    				toggle_class(div, "sg-selected", /*$selectedRow*/ ctx[2] == /*row*/ ctx[0].model.id);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let $hoveredRow;
    	let $selectedRow;
    	let $rowHeight;
    	let { row } = $$props;
    	const { rowHeight } = getContext('options');
    	component_subscribe($$self, rowHeight, value => $$invalidate(3, $rowHeight = value));
    	const { hoveredRow, selectedRow } = getContext('gantt');
    	component_subscribe($$self, hoveredRow, value => $$invalidate(1, $hoveredRow = value));
    	component_subscribe($$self, selectedRow, value => $$invalidate(2, $selectedRow = value));

    	$$self.$$set = $$props => {
    		if ('row' in $$props) $$invalidate(0, row = $$props.row);
    	};

    	return [row, $hoveredRow, $selectedRow, $rowHeight, rowHeight, hoveredRow, selectedRow];
    }

    class Row extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { row: 0 });
    	}
    }

    var css_248z$d = ".sg-milestone.svelte-10k3w4l.svelte-10k3w4l{position:absolute;top:0;bottom:0;white-space:nowrap;height:20px;width:20px;min-width:40px;margin-left:-20px;display:flex;align-items:center;flex-direction:column;transition:background-color 0.2s, opacity 0.2s}.sg-milestone.svelte-10k3w4l .inside.svelte-10k3w4l{position:relative}.sg-milestone.svelte-10k3w4l .inside.svelte-10k3w4l:before{position:absolute;top:0;left:0;content:' ';height:28px;width:28px;transform-origin:0 0;transform:rotate(45deg);background-color:#feac31;border-color:#feac31}.sg-milestone.svelte-10k3w4l.svelte-10k3w4l:not(.moving){transition:transform 0.2s, background-color 0.2s, width 0.2s}.sg-milestone.moving.svelte-10k3w4l.svelte-10k3w4l{z-index:1}.sg-milestone.selected.svelte-10k3w4l.svelte-10k3w4l{outline:2px solid rgba(3, 169, 244, 0.5);outline-offset:3px;z-index:1}";
    styleInject(css_248z$d);

    var css_248z$c = ".sg-time-range.svelte-ezlpj0{height:100%;position:absolute;display:flex;flex-direction:column;align-items:center;background-image:linear-gradient(-45deg, rgba(0, 0, 0, 0) 46%, #e03218 49%, #e03218 51%, rgba(0, 0, 0, 0) 55%);background-size:6px 6px !important;color:red;font-weight:400}.sg-time-range-label.svelte-ezlpj0{margin-top:10px;background:#fff;white-space:nowrap;padding:4px;font-weight:400;font-size:10px}";
    styleInject(css_248z$c);

    /* src/entities/TimeRange.svelte generated by Svelte v3.55.0 */

    function create_if_block$3(ctx) {
    	let div;
    	let t_value = /*model*/ ctx[0].label + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "sg-time-range-label svelte-ezlpj0");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*model*/ 1 && t_value !== (t_value = /*model*/ ctx[0].label + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let div;
    	let div_class_value;
    	let if_block = /*model*/ ctx[0].label && create_if_block$3(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();

    			attr(div, "class", div_class_value = "sg-time-range " + (/*model*/ ctx[0].classes
    			? Array.isArray(/*model*/ ctx[0].classes)
    				? /*model*/ ctx[0].classes.join(' ')
    				: /*model*/ ctx[0].classes
    			: '') + " svelte-ezlpj0");

    			set_style(div, "width", /*_position*/ ctx[2].width + "px");
    			set_style(div, "left", /*_position*/ ctx[2].x + "px");
    			toggle_class(div, "moving", /*resizing*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},
    		p(ctx, [dirty]) {
    			if (/*model*/ ctx[0].label) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*model*/ 1 && div_class_value !== (div_class_value = "sg-time-range " + (/*model*/ ctx[0].classes
    			? Array.isArray(/*model*/ ctx[0].classes)
    				? /*model*/ ctx[0].classes.join(' ')
    				: /*model*/ ctx[0].classes
    			: '') + " svelte-ezlpj0")) {
    				attr(div, "class", div_class_value);
    			}

    			if (dirty & /*_position*/ 4) {
    				set_style(div, "width", /*_position*/ ctx[2].width + "px");
    			}

    			if (dirty & /*_position*/ 4) {
    				set_style(div, "left", /*_position*/ ctx[2].x + "px");
    			}

    			if (dirty & /*model, resizing*/ 3) {
    				toggle_class(div, "moving", /*resizing*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { model } = $$props;
    	let { left } = $$props;
    	let { width } = $$props;
    	let { resizing = false } = $$props;
    	const _position = { width, x: left };

    	$$self.$$set = $$props => {
    		if ('model' in $$props) $$invalidate(0, model = $$props.model);
    		if ('left' in $$props) $$invalidate(3, left = $$props.left);
    		if ('width' in $$props) $$invalidate(4, width = $$props.width);
    		if ('resizing' in $$props) $$invalidate(1, resizing = $$props.resizing);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*left, width*/ 24) {
    			{
    				($$invalidate(2, _position.x = left, _position), $$invalidate(2, _position.width = width, _position));
    			}
    		}
    	};

    	return [model, resizing, _position, left, width];
    }

    class TimeRange extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { model: 0, left: 3, width: 4, resizing: 1 });
    	}
    }

    var css_248z$b = ".sg-time-range-control.svelte-1hnnt3v{position:absolute}.sg-time-range-handle-left.svelte-1hnnt3v{position:absolute;left:0}.sg-time-range-handle-right.svelte-1hnnt3v{position:absolute;right:0}.sg-time-range-handle-left.svelte-1hnnt3v::before,.sg-time-range-handle-right.svelte-1hnnt3v::before{position:absolute;content:'';bottom:4px;border-radius:6px 6px 6px 0;border:2px solid #b0b0b7;width:9px;height:9px;transform:translateX(-50%) rotate(-45deg);background-color:#fff;border-color:#e03218;cursor:ew-resize}";
    styleInject(css_248z$b);

    /* src/entities/TimeRangeHeader.svelte generated by Svelte v3.55.0 */

    function create_fragment$a(ctx) {
    	let div2;
    	let div0;
    	let t;
    	let div1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			attr(div0, "class", "sg-time-range-handle-left svelte-1hnnt3v");
    			attr(div1, "class", "sg-time-range-handle-right svelte-1hnnt3v");
    			attr(div2, "class", "sg-time-range-control svelte-1hnnt3v");
    			set_style(div2, "width", /*_position*/ ctx[0].width + "px");
    			set_style(div2, "left", /*_position*/ ctx[0].x + "px");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			append(div2, t);
    			append(div2, div1);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(/*drag*/ ctx[1].call(null, div0)),
    					action_destroyer(/*drag*/ ctx[1].call(null, div1)),
    					action_destroyer(/*setClass*/ ctx[2].call(null, div2))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*_position*/ 1) {
    				set_style(div2, "width", /*_position*/ ctx[0].width + "px");
    			}

    			if (dirty & /*_position*/ 1) {
    				set_style(div2, "left", /*_position*/ ctx[0].x + "px");
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	const { rowContainer } = getContext('gantt');
    	const { api, utils, columnService } = getContext('services');
    	const { resizeHandleWidth } = getContext('options');
    	let { model } = $$props;
    	let { width } = $$props;
    	let { left } = $$props;
    	const _position = { width, x: left };

    	function drag(node) {
    		const ondrop = event => {
    			const newFrom = utils.roundTo(columnService.getDateByPosition(event.x));
    			const newTo = utils.roundTo(columnService.getDateByPosition(event.x + event.width));
    			const newLeft = columnService.getPositionByDate(newFrom);
    			const newRight = columnService.getPositionByDate(newTo);
    			Object.assign(model, { from: newFrom, to: newTo });

    			update({
    				left: newLeft,
    				width: newRight - newLeft,
    				model,
    				resizing: false
    			});

    			window.removeEventListener('mousemove', onmousemove, false);
    		};

    		function update(state) {
    			timeRangeStore.update(state);
    			$$invalidate(0, _position.x = state.left, _position);
    			$$invalidate(0, _position.width = state.width, _position);
    		}

    		const draggable = new Draggable(node,
    		{
    				onDown: event => {
    					api.timeranges.raise.clicked({ model });

    					update({
    						left: event.x,
    						width: event.width,
    						model,
    						resizing: true
    					});
    				},
    				onResize: event => {
    					api.timeranges.raise.resized({ model, left: event.x, width: event.width });

    					update({
    						left: event.x,
    						width: event.width,
    						model,
    						resizing: true
    					});
    				},
    				dragAllowed: false,
    				resizeAllowed: true,
    				onDrop: ondrop,
    				container: rowContainer,
    				resizeHandleWidth,
    				getX: () => _position.x,
    				getY: () => 0,
    				getWidth: () => _position.width
    			});

    		return { destroy: () => draggable.destroy() };
    	}

    	function setClass(node) {
    		if (!model.classes) return;
    		node.classList.add(model.classes);
    	}

    	$$self.$$set = $$props => {
    		if ('model' in $$props) $$invalidate(3, model = $$props.model);
    		if ('width' in $$props) $$invalidate(4, width = $$props.width);
    		if ('left' in $$props) $$invalidate(5, left = $$props.left);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*left, width*/ 48) {
    			{
    				($$invalidate(0, _position.x = left, _position), $$invalidate(0, _position.width = width, _position));
    			}
    		}
    	};

    	return [_position, drag, setClass, model, width, left];
    }

    class TimeRangeHeader extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { model: 3, width: 4, left: 5 });
    	}
    }

    var css_248z$a = ".column.svelte-1mx1tfz{position:absolute;height:100%;box-sizing:border-box}.column.svelte-1mx1tfz{border-right:#efefef 1px solid}";
    styleInject(css_248z$a);

    class MomentSvelteGanttDateAdapter {
        constructor(moment) {
            this.moment = moment;
        }
        format(date, format) {
            return this.moment(date).format(format);
        }
    }
    class NoopSvelteGanttDateAdapter {
        format(date, format) {
            const d = new Date(date);
            switch (format) {
                case 'H':
                    return d.getHours() + '';
                case 'HH':
                    return pad(d.getHours());
                case 'H:mm':
                    return `${d.getHours()}:${pad(d.getMinutes())}`;
                case 'hh:mm':
                    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                case 'hh:mm:ss':
                    return `${d.getHours()}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                case 'dd/MM/yyyy':
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                case 'dd/MM/yyyy hh:mm':
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}`;
                case 'dd/MM/yyyy hh:mm:ss':
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
                // VPY More formats supported 10/12/2021
                case 'YYYY':
                    return `${d.getFullYear()}`;
                case 'Q':
                    return `${Math.floor(d.getMonth() / 3 + 1)}`;
                case '[Q]Q':
                    return `Q${Math.floor(d.getMonth() / 3 + 1)}`;
                case 'YYYY[Q]Q':
                    return `${d.getFullYear()}Q${Math.floor(d.getMonth() / 3 + 1)}`;
                case 'MM':
                    // var month = d.toLocaleString('default', { month: 'long' });
                    var month = String(d.getMonth() + 1);
                    if (month.length == 1)
                        month = `0${month}`;
                    return `${month}`;
                case 'MMMM':
                    var month = d.toLocaleString('default', { month: 'long' });
                    return `${month.charAt(0).toUpperCase()}${month.substring(1)}`;
                case 'MMMM - YYYY':
                    var month = d.toLocaleString('default', { month: 'long' });
                    return `${month.charAt(0).toUpperCase()}${month.substring(1)}-${d.getFullYear()}`;
                case 'MMMM YYYY':
                    var month = d.toLocaleString('default', { month: 'long' });
                    return `${month.charAt(0).toUpperCase()}${month.substring(1)} ${d.getFullYear()}`;
                case 'MMM':
                    var month = d.toLocaleString('default', { month: 'short' });
                    return `${month.charAt(0).toUpperCase()}${month.substring(1)}`;
                case 'MMM - YYYY':
                    var month = d.toLocaleString('default', { month: 'short' });
                    return `${month.charAt(0).toUpperCase()}${month.substring(1)} - ${d.getFullYear()}`;
                case 'MMM YYYY':
                    var month = d.toLocaleString('default', { month: 'short' });
                    return `${month.charAt(0).toUpperCase()}${month.substring(1)} ${d.getFullYear()}`;
                case 'W':
                    return `${getWeekNumber(d)}`;
                case 'WW':
                    const weeknumber = getWeekNumber(d);
                    return `${weeknumber.toString().length == 1 ? "0" : ''}${weeknumber}`;
                default:
                    console.warn(`Date Format "${format}" is not supported, use another date adapter.`);
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
            }
        }
    }
    function pad(value) {
        let result = value.toString();
        for (let i = result.length; i < 2; i++) {
            result = '0' + result;
        }
        return result;
    }
    function startOf(date, unit) {
        let d = new Date(date);
        let y = d.getFullYear();
        let m = d.getMonth();
        let dt = d.getDate();
        switch (unit) {
            case 'y':
            case 'year':
                return startOfDate(y, 0, 1);
            case 'month':
                return startOfDate(y, m, 1);
            case 'week':
                return startOfDate(y, m, dt, true);
            case 'd':
            case 'day':
                return startOfDate(y, m, dt);
            case 'h':
            case 'hour':
                d.setMinutes(0, 0, 0);
                return d.valueOf();
            case 'm':
            case 'minute':
            case 's':
            case 'second':
                let unitMs = getDuration(unit);
                const value = Math.floor(date / unitMs) * unitMs;
                return value;
            default:
                throw new Error(`Unknown unit: ${unit}`);
        }
    }
    function startOfDate(y, m, d, week = false) {
        if (y < 100 && y >= 0) {
            return new Date(y + 400, m, d).valueOf() - 31536000000;
        }
        else if (week) {
            return getFirstDayOfWeek(new Date(y, m, d).valueOf()).valueOf();
        }
        else {
            return new Date(y, m, d).valueOf();
        }
    }
    function getWeekNumber(d) {
        // Copy date so don't modify original
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        // Get first day of year
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        // Calculate full weeks to nearest Thursday
        const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
        // Return array of year and week number
        return weekNo;
    }
    function getFirstDayOfWeek(d) {
        // 👇️ clone date object, so we don't mutate it
        const date = new Date(d);
        const day = date.getDay(); // 👉️ get day of week
        // 👇️ day of month - day of week (-6 if Sunday), otherwise +1
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }
    function getDuration(unit, offset = 1) {
        switch (unit) {
            case 'y':
            case 'year':
                return offset * 31536000000;
            case 'month':
                return offset * 30 * 24 * 60 * 60 * 1000; // incorrect since months are of different durations
            // 4 cases : 28 - 29 - 30 - 31
            case 'week':
                return offset * 7 * 24 * 60 * 60 * 1000;
            case 'd':
            case 'day':
                return offset * 24 * 60 * 60 * 1000;
            case 'h':
            case 'hour':
                return offset * 60 * 60 * 1000;
            case 'm':
            case 'minute':
                return offset * 60 * 1000;
            case 's':
            case 'second':
                return offset * 1000;
            default:
                throw new Error(`Unknown unit: ${unit}`);
        }
    }
    function addSeconds(date, offset = 1) {
        date.setSeconds(date.getSeconds() + offset);
        return date;
    }
    function addMinutes(date, offset = 1) {
        date.setMinutes(date.getMinutes() + offset);
        return date;
    }
    function addHours(date, offset = 1) {
        date.setHours(date.getHours() + offset);
        return date;
    }
    function addDays(date, offset = 1) {
        date.setDate(date.getDate() + offset);
        date.setHours(0, 0, 0);
        return date;
    }
    function addWeeks(date, offset = 1) {
        const d = date;
        const day = d.getDay();
        const diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        d.setDate(diff);
        d.setHours(0, 0, 0);
        d.setDate(d.getDate() + (7 * offset));
        return d;
    }
    function addMonths(date, offset = 1) {
        date.setMonth(date.getMonth() + offset);
        date.setDate(1);
        date.setHours(0, 0, 0);
        return date;
    }
    function addYears(date, offset = 1) {
        date.setFullYear(date.getFullYear() + offset);
        date.setMonth(0);
        date.setDate(1);
        date.setHours(0, 0, 0);
        return date;
    }
    function getNextDate(date, unit, offset) {
        switch (unit) {
            case 'y':
            case 'year':
                return addYears(date, offset);
            case 'month':
                return addMonths(date, offset);
            case 'week':
                return addWeeks(date, offset);
            case 'd':
            case 'day':
                return addDays(date, offset);
            case 'h':
            case 'hour':
                return addHours(date, offset);
            case 'm':
            case 'minute':
                return addMinutes(date, offset);
            case 's':
            case 'second':
                return addSeconds(date, offset);
        }
    }
    function isUnitFraction(localDate, highlightedDurations) {
        // const localDate = new Date(timestamp * 1000);
        let timeInUnit;
        switch (highlightedDurations.unit) {
            case 'm':
            case 'minute':
                timeInUnit = localDate.getMinutes();
                return highlightedDurations.fractions.includes(timeInUnit);
            case 'h':
            case 'hour':
                timeInUnit = localDate.getHours();
                return highlightedDurations.fractions.includes(timeInUnit);
            case 'd':
            case 'day':
                timeInUnit = localDate.getDay();
                return highlightedDurations.fractions.includes(timeInUnit);
            case 'week':
                getWeekNumber(localDate);
                return highlightedDurations.fractions.includes(timeInUnit);
            case 'dayinMonth':
                timeInUnit = localDate.getDate();
                return highlightedDurations.fractions.includes(timeInUnit);
            case 'month':
                timeInUnit = localDate.getMonth();
                return highlightedDurations.fractions.includes(timeInUnit);
            case 'y':
            case 'year':
                timeInUnit = localDate.getFullYear();
                return highlightedDurations.fractions.includes(timeInUnit);
            default:
                throw new Error(`Invalid unit: ${highlightedDurations.unit}`);
        }
    }
    // Interval start - Interval end - Column unit - Column spacing
    function getAllPeriods(from, to, unit, offset = 1, highlightedDurations) {
        let units = ["y", "year", "month", "week", "d", "day", "h", "hour", "m", "minute", "s", "second"];
        if (units.indexOf(unit) !== -1) {
            let all_periods = [];
            let tmsWorkOld = 0;
            let interval_duration = 0;
            let start = new Date(from); // Starts at hh:mm:ss
            let dateWork = new Date(from);
            let nextDate = getNextDate(dateWork, unit, offset);
            let tmsWork = nextDate.getTime();
            const firstDuration = nextDate.getTime() - from;
            all_periods[0] = Object.assign({ start: start, end: nextDate, from: startOf(from, unit), to: nextDate.getTime(), duration: firstDuration }, (highlightedDurations && isUnitFraction(start, highlightedDurations) && { 'isHighlighted': true }));
            if (tmsWork < to) {
                while (tmsWork < to) {
                    tmsWorkOld = tmsWork;
                    nextDate = getNextDate(new Date(tmsWork), unit, offset);
                    interval_duration = nextDate.getTime() - tmsWork;
                    all_periods.push(Object.assign({ from: tmsWork, to: nextDate.getTime(), duration: interval_duration }, (highlightedDurations && isUnitFraction(new Date(tmsWork), highlightedDurations) && { 'isHighlighted': true })));
                    tmsWork = nextDate.getTime();
                }
                const last_day_duration = to - tmsWorkOld;
                all_periods[all_periods.length - 1].to = to;
                all_periods[all_periods.length - 1].duration = last_day_duration;
                //ToDo: there could be another option for hours, minutes, seconds based on pure math like in getPeriodDuration to optimise performance
            }
            return all_periods;
        }
        throw new Error(`Unknown unit: ${unit}`);
    }

    class GanttUtils {
        /** because gantt width is not always correct */
        /**BlueFox 09.01.23: couldn't reproduce the above so I removed the code
       //totalColumnDuration: number;
       //totalColumnWidth: number;

       constructor() {
       }

       /**
        * Returns position of date on a line if from and to represent length of width
        * @param {*} date
        */
        getPositionByDate(date) {
            return getPositionByDate(date, this.from, this.to, this.width);
        }
        getDateByPosition(x) {
            return getDateByPosition(x, this.from, this.to, this.width);
        }
        roundTo(date) {
            let value = Math.round(date / this.magnetDuration) * this.magnetDuration;
            return value;
        }
    }
    function getPositionByDate(date, from, to, width) {
        if (!date) {
            return undefined;
        }
        let durationTo = date - from;
        let durationToEnd = to - from;
        return durationTo / durationToEnd * width;
    }
    function getDateByPosition(x, from, to, width) {
        let durationTo = (x / width) * (to - from);
        let dateAtPosition = from + durationTo;
        return dateAtPosition;
    }
    // Returns the object on the left and right in an array using the given cmp function.
    // The compare function defined which property of the value to compare (e.g.: c => c.left)
    function getIndicesOnly(input, value, comparer, strict) {
        let lo = -1;
        let hi = input.length;
        while (hi - lo > 1) {
            let mid = Math.floor((lo + hi) / 2);
            if (strict ? comparer(input[mid]) < value : comparer(input[mid]) <= value) {
                lo = mid;
            }
            else {
                hi = mid;
            }
        }
        if (!strict && input[lo] !== undefined && comparer(input[lo]) === value) {
            hi = lo;
        }
        return [lo, hi];
    }
    function get(input, value, comparer, strict) {
        let res = getIndicesOnly(input, value, comparer, strict);
        return [input[res[0]], input[res[1]]];
    }

    var css_248z$9 = ".column-header-row.svelte-u96sjj.svelte-u96sjj{position:relative;white-space:nowrap;height:32px}.column-header-cell.svelte-u96sjj.svelte-u96sjj{position:absolute;height:100%;box-sizing:border-box;text-overflow:clip;text-align:center;display:inline-flex;justify-content:center;align-items:center;font-size:1em;font-size:14px;font-weight:300;transition:background 0.2s;cursor:pointer;user-select:none;border-right:#efefef 1px solid;border-bottom:#efefef 1px solid}.column-header-cell.svelte-u96sjj.svelte-u96sjj:hover{background:#f9f9f9}.column-header-cell.sticky.svelte-u96sjj>.column-header-cell-label.svelte-u96sjj{position:sticky;left:1rem}";
    styleInject(css_248z$9);

    /* src/column/ColumnHeaderRow.svelte generated by Svelte v3.55.0 */

    function get_each_context$6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (34:4) {#each header.columns as _header}
    function create_each_block$6(ctx) {
    	let div1;
    	let div0;
    	let t0_value = (/*_header*/ ctx[12].label || 'N/A') + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[10](/*_header*/ ctx[12]);
    	}

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr(div0, "class", "column-header-cell-label svelte-u96sjj");
    			attr(div1, "class", "column-header-cell svelte-u96sjj");
    			set_style(div1, "left", /*_header*/ ctx[12].left + "px");
    			set_style(div1, "width", /*_header*/ ctx[12].width + "px");
    			toggle_class(div1, "sticky", /*header*/ ctx[0].sticky);
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, t0);
    			append(div1, t1);

    			if (!mounted) {
    				dispose = listen(div1, "click", click_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*header*/ 1 && t0_value !== (t0_value = (/*_header*/ ctx[12].label || 'N/A') + "")) set_data(t0, t0_value);

    			if (dirty & /*header*/ 1) {
    				set_style(div1, "left", /*_header*/ ctx[12].left + "px");
    			}

    			if (dirty & /*header*/ 1) {
    				set_style(div1, "width", /*_header*/ ctx[12].width + "px");
    			}

    			if (dirty & /*header*/ 1) {
    				toggle_class(div1, "sticky", /*header*/ ctx[0].sticky);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let div;
    	let each_value = /*header*/ ctx[0].columns;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "column-header-row svelte-u96sjj");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*header, dispatch*/ 3) {
    				each_value = /*header*/ ctx[0].columns;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$6(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$6(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $width;
    	let $to;
    	let $from;
    	const dispatch = createEventDispatcher();
    	const { from, to, width } = getContext('dimensions');
    	component_subscribe($$self, from, value => $$invalidate(9, $from = value));
    	component_subscribe($$self, to, value => $$invalidate(8, $to = value));
    	component_subscribe($$self, width, value => $$invalidate(7, $width = value));
    	const { dateAdapter } = getContext('options');
    	let { header } = $$props;
    	let { ganttBodyColumns } = $$props;
    	let { ganttBodyUnit } = $$props;

    	const click_handler = _header => dispatch('dateSelected', {
    		from: _header.from,
    		to: _header.to,
    		unit: header.unit
    	});

    	$$self.$$set = $$props => {
    		if ('header' in $$props) $$invalidate(0, header = $$props.header);
    		if ('ganttBodyColumns' in $$props) $$invalidate(5, ganttBodyColumns = $$props.ganttBodyColumns);
    		if ('ganttBodyUnit' in $$props) $$invalidate(6, ganttBodyUnit = $$props.ganttBodyUnit);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*header, ganttBodyUnit, ganttBodyColumns, $from, $to, $width*/ 993) {
    			{
    				if (header.unit === ganttBodyUnit) {
    					$$invalidate(
    						0,
    						header.columns = ganttBodyColumns.map(column => Object.assign(Object.assign({}, column), {
    							label: dateAdapter.format(column.from, header.format)
    						})),
    						header
    					);
    				} else {
    					const periods = getAllPeriods($from.valueOf(), $to.valueOf(), header.unit);
    					let distance_point = 0;
    					let left = 0;

    					$$invalidate(
    						0,
    						header.columns = periods.map(period => {
    							left = distance_point;
    							distance_point = getPositionByDate(period.to, $from.valueOf(), $to.valueOf(), $width);

    							return {
    								width: Math.min(distance_point - left, $width),
    								label: dateAdapter.format(period.from, header.format),
    								from: period.from,
    								to: period.to,
    								left
    							};
    						}),
    						header
    					);
    				}
    			}
    		}
    	};

    	return [
    		header,
    		dispatch,
    		from,
    		to,
    		width,
    		ganttBodyColumns,
    		ganttBodyUnit,
    		$width,
    		$to,
    		$from,
    		click_handler
    	];
    }

    class ColumnHeaderRow extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
    			header: 0,
    			ganttBodyColumns: 5,
    			ganttBodyUnit: 6
    		});
    	}
    }

    /* src/column/ColumnHeader.svelte generated by Svelte v3.55.0 */

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (10:0) {#each headers as header}
    function create_each_block$5(ctx) {
    	let columnheaderrow;
    	let current;

    	columnheaderrow = new ColumnHeaderRow({
    			props: {
    				header: /*header*/ ctx[4],
    				ganttBodyColumns: /*ganttBodyColumns*/ ctx[1],
    				ganttBodyUnit: /*ganttBodyUnit*/ ctx[2]
    			}
    		});

    	columnheaderrow.$on("dateSelected", /*dateSelected_handler*/ ctx[3]);

    	return {
    		c() {
    			create_component(columnheaderrow.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(columnheaderrow, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const columnheaderrow_changes = {};
    			if (dirty & /*headers*/ 1) columnheaderrow_changes.header = /*header*/ ctx[4];
    			if (dirty & /*ganttBodyColumns*/ 2) columnheaderrow_changes.ganttBodyColumns = /*ganttBodyColumns*/ ctx[1];
    			if (dirty & /*ganttBodyUnit*/ 4) columnheaderrow_changes.ganttBodyUnit = /*ganttBodyUnit*/ ctx[2];
    			columnheaderrow.$set(columnheaderrow_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(columnheaderrow.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(columnheaderrow.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(columnheaderrow, detaching);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*headers*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*headers, ganttBodyColumns, ganttBodyUnit*/ 7) {
    				each_value = /*headers*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { headers } = $$props;
    	let { ganttBodyColumns } = $$props;
    	let { ganttBodyUnit } = $$props;

    	function dateSelected_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('headers' in $$props) $$invalidate(0, headers = $$props.headers);
    		if ('ganttBodyColumns' in $$props) $$invalidate(1, ganttBodyColumns = $$props.ganttBodyColumns);
    		if ('ganttBodyUnit' in $$props) $$invalidate(2, ganttBodyUnit = $$props.ganttBodyUnit);
    	};

    	return [headers, ganttBodyColumns, ganttBodyUnit, dateSelected_handler];
    }

    class ColumnHeader extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			headers: 0,
    			ganttBodyColumns: 1,
    			ganttBodyUnit: 2
    		});
    	}
    }

    var css_248z$8 = ".sg-columns.svelte-12h4h4q{position:absolute;height:100%;width:100%}.sg-column.svelte-12h4h4q{position:absolute;height:100%;width:100%;box-sizing:border-box}";
    styleInject(css_248z$8);

    /* src/column/Columns.svelte generated by Svelte v3.55.0 */

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (11:1) {#each columns as column}
    function create_each_block$4(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "sg-column svelte-12h4h4q");

    			set_style(div, "border-right", (/*column*/ ctx[4].bgHighlightColor
    			? 0
    			: /*columnStrokeWidth*/ ctx[1]) + "px solid " + (/*column*/ ctx[4].bgHighlightColor || /*columnStrokeColor*/ ctx[2]));

    			set_style(div, "left", /*column*/ ctx[4].left + "px");
    			set_style(div, "width", /*column*/ ctx[4].width + "px");
    			set_style(div, "background-color", /*column*/ ctx[4].bgHighlightColor || /*columnDefaultColor*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*columns, columnStrokeWidth, columnStrokeColor*/ 7) {
    				set_style(div, "border-right", (/*column*/ ctx[4].bgHighlightColor
    				? 0
    				: /*columnStrokeWidth*/ ctx[1]) + "px solid " + (/*column*/ ctx[4].bgHighlightColor || /*columnStrokeColor*/ ctx[2]));
    			}

    			if (dirty & /*columns*/ 1) {
    				set_style(div, "left", /*column*/ ctx[4].left + "px");
    			}

    			if (dirty & /*columns*/ 1) {
    				set_style(div, "width", /*column*/ ctx[4].width + "px");
    			}

    			if (dirty & /*columns, columnDefaultColor*/ 9) {
    				set_style(div, "background-color", /*column*/ ctx[4].bgHighlightColor || /*columnDefaultColor*/ ctx[3]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	let div;
    	let each_value = /*columns*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "sg-columns svelte-12h4h4q");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*columns, columnStrokeWidth, columnStrokeColor, columnDefaultColor*/ 15) {
    				each_value = /*columns*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { columns } = $$props;
    	let { columnStrokeWidth } = $$props;
    	let { columnStrokeColor } = $$props;
    	let { columnDefaultColor = '#ffffff' } = $$props;

    	$$self.$$set = $$props => {
    		if ('columns' in $$props) $$invalidate(0, columns = $$props.columns);
    		if ('columnStrokeWidth' in $$props) $$invalidate(1, columnStrokeWidth = $$props.columnStrokeWidth);
    		if ('columnStrokeColor' in $$props) $$invalidate(2, columnStrokeColor = $$props.columnStrokeColor);
    		if ('columnDefaultColor' in $$props) $$invalidate(3, columnDefaultColor = $$props.columnDefaultColor);
    	};

    	return [columns, columnStrokeWidth, columnStrokeColor, columnDefaultColor];
    }

    class Columns extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			columns: 0,
    			columnStrokeWidth: 1,
    			columnStrokeColor: 2,
    			columnDefaultColor: 3
    		});
    	}
    }

    var css_248z$7 = ".sg-context-menu.svelte-1a9x2in{position:absolute;background:white;border:1px solid #ccc;padding:0.25em 0;font-size:10px;transition:opacity 0.4s ease 0s;opacity:1;box-shadow:rgba(0, 0, 0, 0.32) 1px 1px 3px 0px}.context-option.svelte-1a9x2in:hover{background:#eee}.context-option.svelte-1a9x2in{cursor:default;padding:0.2em 1em}";
    styleInject(css_248z$7);

    var css_248z$6 = ".sg-resize.svelte-v0xg82{z-index:2;background:#e9eaeb;width:5px;cursor:col-resize;position:absolute;height:100%;transition:width 0.2s, transform 0.2s}.sg-resize.svelte-v0xg82:hover{transform:translateX(-2px);width:10px}";
    styleInject(css_248z$6);

    /* src/ui/Resizer.svelte generated by Svelte v3.55.0 */

    function create_fragment$6(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "sg-resize svelte-v0xg82");
    			set_style(div, "left", /*x*/ ctx[0] + "px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(/*resizer*/ ctx[1].call(null, div));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*x*/ 1) {
    				set_style(div, "left", /*x*/ ctx[0] + "px");
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { x } = $$props;
    	let { container } = $$props;

    	const dragOptions = {
    		onDrag: event => {
    			($$invalidate(0, x = event.x));
    			dispatch('resize', { left: x });
    			setCursor('col-resize');
    		},
    		onDrop: event => {
    			($$invalidate(0, x = event.x));
    			dispatch('resize', { left: x });
    			setCursor('default');
    		},
    		dragAllowed: true,
    		resizeAllowed: false,
    		container,
    		getX: () => x,
    		getY: () => 0,
    		getWidth: () => 0
    	};

    	function resizer(node) {
    		return new Draggable(node, dragOptions, 'resizer');
    	}

    	$$self.$$set = $$props => {
    		if ('x' in $$props) $$invalidate(0, x = $$props.x);
    		if ('container' in $$props) $$invalidate(2, container = $$props.container);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*container*/ 4) {
    			dragOptions.container = container;
    		}
    	};

    	return [x, resizer, container];
    }

    class Resizer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { x: 0, container: 2 });
    	}
    }

    class GanttApi {
        constructor() {
            this.listeners = [];
            this.listenersMap = {};
        }
        registerEvent(featureName, eventName) {
            if (!this[featureName]) {
                this[featureName] = {};
            }
            const feature = this[featureName];
            if (!feature.on) {
                feature.on = {};
                feature.raise = {};
            }
            let eventId = 'on:' + featureName + ':' + eventName;
            feature.raise[eventName] = (...params) => {
                //todo add svelte? event listeners, looping isnt effective unless rarely used
                this.listeners.forEach(listener => {
                    if (listener.eventId === eventId) {
                        listener.handler(params);
                    }
                });
            };
            // Creating on event method featureName.oneventName
            feature.on[eventName] = (handler) => {
                // track our listener so we can turn off and on
                let listener = {
                    handler: handler,
                    eventId: eventId
                };
                this.listenersMap[eventId] = listener;
                this.listeners.push(listener);
                const removeListener = () => {
                    const index = this.listeners.indexOf(listener);
                    this.listeners.splice(index, 1);
                };
                return removeListener;
            };
        }
    }

    class RowFactory {
        constructor() {
        }
        createRow(row, y) {
            // defaults
            // id of task, every task needs to have a unique one
            //row.id = row.id || undefined;
            // css classes
            row.classes = row.classes || '';
            // html content of row
            row.contentHtml = row.contentHtml || undefined;
            // enable dragging of tasks to and from this row 
            row.enableDragging = row.enableDragging === undefined ? true : row.enableDragging;
            // height of row element
            const height = row.height || this.rowHeight;
            return {
                model: row,
                y,
                height,
                expanded: true
            };
        }
        createRows(rows) {
            const ctx = { y: 0, result: [] };
            this.createChildRows(rows, ctx);
            return ctx.result;
        }
        createChildRows(rowModels, ctx, parent = null, level = 0, parents = []) {
            const rowsAtLevel = [];
            const allRows = [];
            if (parent) {
                parents = [...parents, parent];
            }
            rowModels.forEach(rowModel => {
                const row = this.createRow(rowModel, ctx.y);
                ctx.result.push(row);
                rowsAtLevel.push(row);
                allRows.push(row);
                row.childLevel = level;
                row.parent = parent;
                row.allParents = parents;
                ctx.y += row.height;
                if (rowModel.children) {
                    const nextLevel = this.createChildRows(rowModel.children, ctx, row, level + 1, parents);
                    row.children = nextLevel.rows;
                    row.allChildren = nextLevel.allRows;
                    allRows.push(...nextLevel.allRows);
                }
            });
            return {
                rows: rowsAtLevel,
                allRows
            };
        }
    }

    class TimeRangeFactory {
        constructor(columnService) {
            this.columnService = columnService;
        }
        create(model) {
            // enable dragging
            model.enableResizing = model.enableResizing === undefined ? true : model.enableResizing;
            const left = this.columnService.getPositionByDate(model.from);
            const right = this.columnService.getPositionByDate(model.to);
            return {
                model,
                left: left,
                width: right - left,
                resizing: false
            };
        }
    }

    function findByPosition(columns, x) {
        const result = get(columns, x, c => c.left);
        return result;
    }
    function findByDate(columns, x) {
        const result = get(columns, x, c => c.from);
        return result;
    }

    const callbacks = {};
    function onDelegatedEvent(type, attr, callback) {
        if (!callbacks[type])
            callbacks[type] = {};
        callbacks[type][attr] = callback;
    }
    function offDelegatedEvent(type, attr) {
        delete callbacks[type][attr];
    }
    function matches(cbs, element) {
        let data;
        for (let attr in cbs) {
            if (data = element.getAttribute(attr)) {
                return { attr, data };
            }
        }
    }
    function onEvent(e) {
        let { type, target } = e;
        const cbs = callbacks[type];
        if (!cbs)
            return;
        let match;
        let element = target;
        while (element && element != e.currentTarget) {
            if ((match = matches(cbs, element))) {
                break;
            }
            element = element.parentElement;
        }
        if (match && cbs[match.attr]) {
            cbs[match.attr](e, match.data, element);
        }
        else if (cbs['empty']) {
            cbs['empty'](e, null, element);
        }
    }

    var css_248z$5 = ".sg-disable-transition.svelte-19aqw4w .sg-task,.sg-disable-transition.svelte-19aqw4w .sg-milestone{transition:transform 0s, background-color 0.2s, width 0s !important}.sg-view:not(:first-child){margin-left:5px}.sg-timeline.svelte-19aqw4w{flex:1 1 0%;display:flex;flex-direction:column;overflow-x:auto}.sg-gantt.svelte-19aqw4w{display:flex;width:100%;height:100%;position:relative}.sg-foreground.svelte-19aqw4w{box-sizing:border-box;overflow:hidden;top:0;left:0;position:absolute;width:100%;height:100%;z-index:1;pointer-events:none}.sg-rows.svelte-19aqw4w{width:100%;box-sizing:border-box;overflow:hidden}.sg-timeline-body.svelte-19aqw4w{overflow:auto;flex:1 1 auto}.sg-header-scroller.svelte-19aqw4w{border-right:1px solid #efefef;overflow:hidden;position:relative}.content.svelte-19aqw4w{position:relative}*{box-sizing:border-box}";
    styleInject(css_248z$5);

    /* src/Gantt.svelte generated by Svelte v3.55.0 */

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[123] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[126] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[129] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[132] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[129] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[123] = list[i];
    	return child_ctx;
    }

    // (555:4) {#each ganttTableModules as module}
    function create_each_block_5(ctx) {
    	let switch_instance;
    	let t;
    	let resizer;
    	let current;

    	const switch_instance_spread_levels = [
    		{
    			rowContainerHeight: /*rowContainerHeight*/ ctx[18]
    		},
    		{ paddingTop: /*paddingTop*/ ctx[19] },
    		{ paddingBottom: /*paddingBottom*/ ctx[20] },
    		{ tableWidth: /*tableWidth*/ ctx[2] },
    		/*$$restProps*/ ctx[42],
    		{ visibleRows: /*visibleRows*/ ctx[8] }
    	];

    	var switch_value = /*module*/ ctx[123];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props());
    		switch_instance.$on("init", onModuleInit);
    	}

    	resizer = new Resizer({
    			props: {
    				x: /*tableWidth*/ ctx[2],
    				container: /*ganttElement*/ ctx[11]
    			}
    		});

    	resizer.$on("resize", /*onResize*/ ctx[39]);

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			t = space();
    			create_component(resizer.$$.fragment);
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, t, anchor);
    			mount_component(resizer, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty[0] & /*rowContainerHeight, paddingTop, paddingBottom, tableWidth, visibleRows*/ 1835268 | dirty[1] & /*$$restProps*/ 2048)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty[0] & /*rowContainerHeight*/ 262144 && {
    						rowContainerHeight: /*rowContainerHeight*/ ctx[18]
    					},
    					dirty[0] & /*paddingTop*/ 524288 && { paddingTop: /*paddingTop*/ ctx[19] },
    					dirty[0] & /*paddingBottom*/ 1048576 && { paddingBottom: /*paddingBottom*/ ctx[20] },
    					dirty[0] & /*tableWidth*/ 4 && { tableWidth: /*tableWidth*/ ctx[2] },
    					dirty[1] & /*$$restProps*/ 2048 && get_spread_object(/*$$restProps*/ ctx[42]),
    					dirty[0] & /*visibleRows*/ 256 && { visibleRows: /*visibleRows*/ ctx[8] }
    				])
    			: {};

    			if (switch_value !== (switch_value = /*module*/ ctx[123])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props());
    					switch_instance.$on("init", onModuleInit);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, t.parentNode, t);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}

    			const resizer_changes = {};
    			if (dirty[0] & /*tableWidth*/ 4) resizer_changes.x = /*tableWidth*/ ctx[2];
    			if (dirty[0] & /*ganttElement*/ 2048) resizer_changes.container = /*ganttElement*/ ctx[11];
    			resizer.$set(resizer_changes);
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			transition_in(resizer.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			transition_out(resizer.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (switch_instance) destroy_component(switch_instance, detaching);
    			if (detaching) detach(t);
    			destroy_component(resizer, detaching);
    		}
    	};
    }

    // (566:20) {#each $allTimeRanges as timeRange (timeRange.model.id)}
    function create_each_block_4(key_1, ctx) {
    	let first;
    	let timerangeheader;
    	let current;
    	const timerangeheader_spread_levels = [/*timeRange*/ ctx[129]];
    	let timerangeheader_props = {};

    	for (let i = 0; i < timerangeheader_spread_levels.length; i += 1) {
    		timerangeheader_props = assign(timerangeheader_props, timerangeheader_spread_levels[i]);
    	}

    	timerangeheader = new TimeRangeHeader({ props: timerangeheader_props });

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(timerangeheader.$$.fragment);
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(timerangeheader, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			const timerangeheader_changes = (dirty[0] & /*$allTimeRanges*/ 8388608)
    			? get_spread_update(timerangeheader_spread_levels, [get_spread_object(/*timeRange*/ ctx[129])])
    			: {};

    			timerangeheader.$set(timerangeheader_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(timerangeheader.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(timerangeheader.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(timerangeheader, detaching);
    		}
    	};
    }

    // (580:24) {#each visibleRows as row (row.model.id)}
    function create_each_block_3(key_1, ctx) {
    	let first;
    	let row;
    	let current;
    	row = new Row({ props: { row: /*row*/ ctx[132] } });

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(row.$$.fragment);
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(row, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const row_changes = {};
    			if (dirty[0] & /*visibleRows*/ 256) row_changes.row = /*row*/ ctx[132];
    			row.$set(row_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(row.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(row.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(row, detaching);
    		}
    	};
    }

    // (587:20) {#each $allTimeRanges as timeRange (timeRange.model.id)}
    function create_each_block_2(key_1, ctx) {
    	let first;
    	let timerange;
    	let current;
    	const timerange_spread_levels = [/*timeRange*/ ctx[129]];
    	let timerange_props = {};

    	for (let i = 0; i < timerange_spread_levels.length; i += 1) {
    		timerange_props = assign(timerange_props, timerange_spread_levels[i]);
    	}

    	timerange = new TimeRange({ props: timerange_props });

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(timerange.$$.fragment);
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(timerange, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			const timerange_changes = (dirty[0] & /*$allTimeRanges*/ 8388608)
    			? get_spread_update(timerange_spread_levels, [get_spread_object(/*timeRange*/ ctx[129])])
    			: {};

    			timerange.$set(timerange_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(timerange.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(timerange.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(timerange, detaching);
    		}
    	};
    }

    // (591:20) {#each visibleTasks as task (task.model.id)}
    function create_each_block_1$1(key_1, ctx) {
    	let first;
    	let task;
    	let current;

    	const task_spread_levels = [
    		{ model: /*task*/ ctx[126].model },
    		{ left: /*task*/ ctx[126].left },
    		{ width: /*task*/ ctx[126].width },
    		{ height: /*task*/ ctx[126].height },
    		{ top: /*task*/ ctx[126].top },
    		/*task*/ ctx[126]
    	];

    	let task_props = {};

    	for (let i = 0; i < task_spread_levels.length; i += 1) {
    		task_props = assign(task_props, task_spread_levels[i]);
    	}

    	task = new Task({ props: task_props });

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(task.$$.fragment);
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(task, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			const task_changes = (dirty[0] & /*visibleTasks*/ 2097152)
    			? get_spread_update(task_spread_levels, [
    					{ model: /*task*/ ctx[126].model },
    					{ left: /*task*/ ctx[126].left },
    					{ width: /*task*/ ctx[126].width },
    					{ height: /*task*/ ctx[126].height },
    					{ top: /*task*/ ctx[126].top },
    					get_spread_object(/*task*/ ctx[126])
    				])
    			: {};

    			task.$set(task_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(task.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(task.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(task, detaching);
    		}
    	};
    }

    // (596:16) {#each ganttBodyModules as module}
    function create_each_block$3(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ paddingTop: /*paddingTop*/ ctx[19] },
    		{ paddingBottom: /*paddingBottom*/ ctx[20] },
    		{ visibleRows: /*visibleRows*/ ctx[8] },
    		/*$$restProps*/ ctx[42]
    	];

    	var switch_value = /*module*/ ctx[123];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props());
    		switch_instance.$on("init", onModuleInit);
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty[0] & /*paddingTop, paddingBottom, visibleRows*/ 1573120 | dirty[1] & /*$$restProps*/ 2048)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty[0] & /*paddingTop*/ 524288 && { paddingTop: /*paddingTop*/ ctx[19] },
    					dirty[0] & /*paddingBottom*/ 1048576 && { paddingBottom: /*paddingBottom*/ ctx[20] },
    					dirty[0] & /*visibleRows*/ 256 && { visibleRows: /*visibleRows*/ ctx[8] },
    					dirty[1] & /*$$restProps*/ 2048 && get_spread_object(/*$$restProps*/ ctx[42])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*module*/ ctx[123])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props());
    					switch_instance.$on("init", onModuleInit);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let div9;
    	let t0;
    	let div8;
    	let div2;
    	let div1;
    	let div0;
    	let columnheader;
    	let t1;
    	let each_blocks_4 = [];
    	let each1_lookup = new Map();
    	let div2_resize_listener;
    	let t2;
    	let div7;
    	let div6;
    	let columns_1;
    	let t3;
    	let div4;
    	let div3;
    	let each_blocks_3 = [];
    	let each2_lookup = new Map();
    	let t4;
    	let div5;
    	let each_blocks_2 = [];
    	let each3_lookup = new Map();
    	let t5;
    	let each_blocks_1 = [];
    	let each4_lookup = new Map();
    	let t6;
    	let div7_resize_listener;
    	let div9_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_5 = /*ganttTableModules*/ ctx[4];
    	let each_blocks_5 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_5[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	const out = i => transition_out(each_blocks_5[i], 1, 1, () => {
    		each_blocks_5[i] = null;
    	});

    	columnheader = new ColumnHeader({
    			props: {
    				headers: /*headers*/ ctx[1],
    				ganttBodyColumns: /*columns*/ ctx[16],
    				ganttBodyUnit: /*columnUnit*/ ctx[0]
    			}
    		});

    	columnheader.$on("dateSelected", /*onDateSelected*/ ctx[41]);
    	let each_value_4 = /*$allTimeRanges*/ ctx[23];
    	const get_key = ctx => /*timeRange*/ ctx[129].model.id;

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		let child_ctx = get_each_context_4(ctx, each_value_4, i);
    		let key = get_key(child_ctx);
    		each1_lookup.set(key, each_blocks_4[i] = create_each_block_4(key, child_ctx));
    	}

    	columns_1 = new Columns({
    			props: {
    				columns: /*columns*/ ctx[16],
    				columnStrokeColor: /*columnStrokeColor*/ ctx[6],
    				columnStrokeWidth: /*columnStrokeWidth*/ ctx[7]
    			}
    		});

    	let each_value_3 = /*visibleRows*/ ctx[8];
    	const get_key_1 = ctx => /*row*/ ctx[132].model.id;

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		let child_ctx = get_each_context_3(ctx, each_value_3, i);
    		let key = get_key_1(child_ctx);
    		each2_lookup.set(key, each_blocks_3[i] = create_each_block_3(key, child_ctx));
    	}

    	let each_value_2 = /*$allTimeRanges*/ ctx[23];
    	const get_key_2 = ctx => /*timeRange*/ ctx[129].model.id;

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key_2(child_ctx);
    		each3_lookup.set(key, each_blocks_2[i] = create_each_block_2(key, child_ctx));
    	}

    	let each_value_1 = /*visibleTasks*/ ctx[21];
    	const get_key_3 = ctx => /*task*/ ctx[126].model.id;

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key_3(child_ctx);
    		each4_lookup.set(key, each_blocks_1[i] = create_each_block_1$1(key, child_ctx));
    	}

    	let each_value = /*ganttBodyModules*/ ctx[5];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div9 = element("div");

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].c();
    			}

    			t0 = space();
    			div8 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			create_component(columnheader.$$.fragment);
    			t1 = space();

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			t2 = space();
    			div7 = element("div");
    			div6 = element("div");
    			create_component(columns_1.$$.fragment);
    			t3 = space();
    			div4 = element("div");
    			div3 = element("div");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t4 = space();
    			div5 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t5 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div0, "class", "header-container");
    			set_style(div0, "width", /*$_width*/ ctx[10] + "px");
    			attr(div1, "class", "sg-header-scroller svelte-19aqw4w");
    			attr(div2, "class", "sg-header");
    			add_render_callback(() => /*div2_elementresize_handler*/ ctx[100].call(div2));
    			set_style(div3, "transform", "translateY(" + /*paddingTop*/ ctx[19] + "px)");
    			attr(div4, "class", "sg-rows svelte-19aqw4w");
    			set_style(div4, "height", /*rowContainerHeight*/ ctx[18] + "px");
    			attr(div5, "class", "sg-foreground svelte-19aqw4w");
    			attr(div6, "class", "content svelte-19aqw4w");
    			set_style(div6, "width", /*$_width*/ ctx[10] + "px");
    			attr(div7, "class", "sg-timeline-body svelte-19aqw4w");
    			add_render_callback(() => /*div7_elementresize_handler*/ ctx[103].call(div7));
    			toggle_class(div7, "zooming", /*zooming*/ ctx[17]);
    			attr(div8, "class", "sg-timeline sg-view svelte-19aqw4w");
    			attr(div9, "class", div9_class_value = "sg-gantt " + /*classes*/ ctx[3] + " svelte-19aqw4w");
    			toggle_class(div9, "sg-disable-transition", !/*disableTransition*/ ctx[15]);
    		},
    		m(target, anchor) {
    			insert(target, div9, anchor);

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].m(div9, null);
    			}

    			append(div9, t0);
    			append(div9, div8);
    			append(div8, div2);
    			append(div2, div1);
    			append(div1, div0);
    			mount_component(columnheader, div0, null);
    			append(div0, t1);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].m(div0, null);
    			}

    			/*div2_binding*/ ctx[99](div2);
    			div2_resize_listener = add_resize_listener(div2, /*div2_elementresize_handler*/ ctx[100].bind(div2));
    			append(div8, t2);
    			append(div8, div7);
    			append(div7, div6);
    			mount_component(columns_1, div6, null);
    			append(div6, t3);
    			append(div6, div4);
    			append(div4, div3);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(div3, null);
    			}

    			/*div4_binding*/ ctx[101](div4);
    			append(div6, t4);
    			append(div6, div5);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div5, null);
    			}

    			append(div5, t5);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div5, null);
    			}

    			append(div6, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div6, null);
    			}

    			/*div7_binding*/ ctx[102](div7);
    			div7_resize_listener = add_resize_listener(div7, /*div7_elementresize_handler*/ ctx[103].bind(div7));
    			/*div9_binding*/ ctx[104](div9);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(/*horizontalScrollListener*/ ctx[38].call(null, div1)),
    					action_destroyer(/*scrollable*/ ctx[37].call(null, div7)),
    					listen(div7, "wheel", /*onwheel*/ ctx[40]),
    					listen(div9, "mousedown", stop_propagation(onEvent)),
    					listen(div9, "click", stop_propagation(onEvent)),
    					listen(div9, "mouseover", onEvent),
    					listen(div9, "mouseleave", onEvent)
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*tableWidth, ganttElement, ganttTableModules, rowContainerHeight, paddingTop, paddingBottom, visibleRows*/ 1837332 | dirty[1] & /*onResize, $$restProps*/ 2304) {
    				each_value_5 = /*ganttTableModules*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks_5[i]) {
    						each_blocks_5[i].p(child_ctx, dirty);
    						transition_in(each_blocks_5[i], 1);
    					} else {
    						each_blocks_5[i] = create_each_block_5(child_ctx);
    						each_blocks_5[i].c();
    						transition_in(each_blocks_5[i], 1);
    						each_blocks_5[i].m(div9, t0);
    					}
    				}

    				group_outros();

    				for (i = each_value_5.length; i < each_blocks_5.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const columnheader_changes = {};
    			if (dirty[0] & /*headers*/ 2) columnheader_changes.headers = /*headers*/ ctx[1];
    			if (dirty[0] & /*columns*/ 65536) columnheader_changes.ganttBodyColumns = /*columns*/ ctx[16];
    			if (dirty[0] & /*columnUnit*/ 1) columnheader_changes.ganttBodyUnit = /*columnUnit*/ ctx[0];
    			columnheader.$set(columnheader_changes);

    			if (dirty[0] & /*$allTimeRanges*/ 8388608) {
    				each_value_4 = /*$allTimeRanges*/ ctx[23];
    				group_outros();
    				each_blocks_4 = update_keyed_each(each_blocks_4, dirty, get_key, 1, ctx, each_value_4, each1_lookup, div0, outro_and_destroy_block, create_each_block_4, null, get_each_context_4);
    				check_outros();
    			}

    			if (!current || dirty[0] & /*$_width*/ 1024) {
    				set_style(div0, "width", /*$_width*/ ctx[10] + "px");
    			}

    			const columns_1_changes = {};
    			if (dirty[0] & /*columns*/ 65536) columns_1_changes.columns = /*columns*/ ctx[16];
    			if (dirty[0] & /*columnStrokeColor*/ 64) columns_1_changes.columnStrokeColor = /*columnStrokeColor*/ ctx[6];
    			if (dirty[0] & /*columnStrokeWidth*/ 128) columns_1_changes.columnStrokeWidth = /*columnStrokeWidth*/ ctx[7];
    			columns_1.$set(columns_1_changes);

    			if (dirty[0] & /*visibleRows*/ 256) {
    				each_value_3 = /*visibleRows*/ ctx[8];
    				group_outros();
    				each_blocks_3 = update_keyed_each(each_blocks_3, dirty, get_key_1, 1, ctx, each_value_3, each2_lookup, div3, outro_and_destroy_block, create_each_block_3, null, get_each_context_3);
    				check_outros();
    			}

    			if (!current || dirty[0] & /*paddingTop*/ 524288) {
    				set_style(div3, "transform", "translateY(" + /*paddingTop*/ ctx[19] + "px)");
    			}

    			if (!current || dirty[0] & /*rowContainerHeight*/ 262144) {
    				set_style(div4, "height", /*rowContainerHeight*/ ctx[18] + "px");
    			}

    			if (dirty[0] & /*$allTimeRanges*/ 8388608) {
    				each_value_2 = /*$allTimeRanges*/ ctx[23];
    				group_outros();
    				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key_2, 1, ctx, each_value_2, each3_lookup, div5, outro_and_destroy_block, create_each_block_2, t5, get_each_context_2);
    				check_outros();
    			}

    			if (dirty[0] & /*visibleTasks*/ 2097152) {
    				each_value_1 = /*visibleTasks*/ ctx[21];
    				group_outros();
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_3, 1, ctx, each_value_1, each4_lookup, div5, outro_and_destroy_block, create_each_block_1$1, null, get_each_context_1$1);
    				check_outros();
    			}

    			if (dirty[0] & /*ganttBodyModules, paddingTop, paddingBottom, visibleRows*/ 1573152 | dirty[1] & /*$$restProps*/ 2048) {
    				each_value = /*ganttBodyModules*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div6, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty[0] & /*$_width*/ 1024) {
    				set_style(div6, "width", /*$_width*/ ctx[10] + "px");
    			}

    			if (!current || dirty[0] & /*zooming*/ 131072) {
    				toggle_class(div7, "zooming", /*zooming*/ ctx[17]);
    			}

    			if (!current || dirty[0] & /*classes*/ 8 && div9_class_value !== (div9_class_value = "sg-gantt " + /*classes*/ ctx[3] + " svelte-19aqw4w")) {
    				attr(div9, "class", div9_class_value);
    			}

    			if (!current || dirty[0] & /*classes, disableTransition*/ 32776) {
    				toggle_class(div9, "sg-disable-transition", !/*disableTransition*/ ctx[15]);
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_5.length; i += 1) {
    				transition_in(each_blocks_5[i]);
    			}

    			transition_in(columnheader.$$.fragment, local);

    			for (let i = 0; i < each_value_4.length; i += 1) {
    				transition_in(each_blocks_4[i]);
    			}

    			transition_in(columns_1.$$.fragment, local);

    			for (let i = 0; i < each_value_3.length; i += 1) {
    				transition_in(each_blocks_3[i]);
    			}

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_2[i]);
    			}

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks_5 = each_blocks_5.filter(Boolean);

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				transition_out(each_blocks_5[i]);
    			}

    			transition_out(columnheader.$$.fragment, local);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				transition_out(each_blocks_4[i]);
    			}

    			transition_out(columns_1.$$.fragment, local);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				transition_out(each_blocks_3[i]);
    			}

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				transition_out(each_blocks_2[i]);
    			}

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div9);
    			destroy_each(each_blocks_5, detaching);
    			destroy_component(columnheader);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].d();
    			}

    			/*div2_binding*/ ctx[99](null);
    			div2_resize_listener();
    			destroy_component(columns_1);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].d();
    			}

    			/*div4_binding*/ ctx[101](null);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].d();
    			}

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			destroy_each(each_blocks, detaching);
    			/*div7_binding*/ ctx[102](null);
    			div7_resize_listener();
    			/*div9_binding*/ ctx[104](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function assertSet(values) {
    	for (const name in values) {
    		if (values[name] == null) {
    			throw new Error(`"${name}" is not set`);
    		}
    	}
    }

    function toDateNum(date) {
    	return date instanceof Date ? date.valueOf() : date;
    }

    function onModuleInit(module) {
    	
    }

    function instance$5($$self, $$props, $$invalidate) {
    	const omit_props_names = [
    		"rows","tasks","timeRanges","rowPadding","rowHeight","from","to","minWidth","fitWidth","classes","headers","zoomLevels","taskContent","tableWidth","resizeHandleWidth","onTaskButtonClick","dateAdapter","magnetUnit","magnetOffset","columnUnit","columnOffset","ganttTableModules","ganttBodyModules","reflectOnParentRows","reflectOnChildRows","columnStrokeColor","columnStrokeWidth","highlightedDurations","highlightColor","taskElementHook","columnService","api","taskFactory","rowFactory","dndManager","timeRangeFactory","utils","refreshTimeRanges","refreshTasks","getRowContainer","selectTask","unselectTasks","scrollToRow","scrollToTask","updateTask","updateTasks","updateRow","updateRows","getRow","getTask","getTasks"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let $taskStore;
    	let $rowTaskCache;
    	let $visibleHeight;
    	let $allRows;
    	let $rowStore;
    	let $allTasks;
    	let $_width;
    	let $_to;
    	let $_from;
    	let $_rowPadding;
    	let $_fitWidth;
    	let $_minWidth;
    	let $hoveredRow;
    	let $selectedRow;
    	let $_rowHeight;
    	let $headerHeight;
    	let $allTimeRanges;
    	let $visibleWidth;
    	component_subscribe($$self, taskStore, $$value => $$invalidate(92, $taskStore = $$value));
    	component_subscribe($$self, rowTaskCache, $$value => $$invalidate(93, $rowTaskCache = $$value));
    	component_subscribe($$self, allRows, $$value => $$invalidate(94, $allRows = $$value));
    	component_subscribe($$self, rowStore, $$value => $$invalidate(95, $rowStore = $$value));
    	component_subscribe($$self, allTasks, $$value => $$invalidate(107, $allTasks = $$value));
    	component_subscribe($$self, allTimeRanges, $$value => $$invalidate(23, $allTimeRanges = $$value));

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	let ganttElement;
    	let mainHeaderContainer;
    	let mainContainer;
    	let rowContainer;
    	let scrollables = [];
    	let mounted = false;
    	let { rows } = $$props;
    	let { tasks = [] } = $$props;
    	let { timeRanges = [] } = $$props;
    	assertSet({ rows });
    	let { rowPadding = 6 } = $$props;
    	let { rowHeight = 52 } = $$props;
    	const _rowHeight = writable(rowHeight);
    	component_subscribe($$self, _rowHeight, value => $$invalidate(112, $_rowHeight = value));
    	const _rowPadding = writable(rowPadding);
    	component_subscribe($$self, _rowPadding, value => $$invalidate(98, $_rowPadding = value));
    	let { from } = $$props;
    	let { to } = $$props;
    	assertSet({ from, to });
    	const _from = writable(toDateNum(from));
    	component_subscribe($$self, _from, value => $$invalidate(97, $_from = value));
    	const _to = writable(toDateNum(to));
    	component_subscribe($$self, _to, value => $$invalidate(96, $_to = value));
    	let { minWidth = 800 } = $$props;
    	let { fitWidth = false } = $$props;
    	const _minWidth = writable(minWidth);
    	component_subscribe($$self, _minWidth, value => $$invalidate(109, $_minWidth = value));
    	const _fitWidth = writable(fitWidth);
    	component_subscribe($$self, _fitWidth, value => $$invalidate(108, $_fitWidth = value));
    	let { classes = [] } = $$props;
    	let { headers = [{ unit: 'day', format: 'MMMM Do' }, { unit: 'hour', format: 'H:mm' }] } = $$props;

    	let { zoomLevels = [
    		{
    			headers: [{ unit: 'day', format: 'DD.MM.YYYY' }, { unit: 'hour', format: 'HH' }],
    			minWidth: 800,
    			fitWidth: true
    		},
    		{
    			headers: [
    				{ unit: 'hour', format: 'ddd D/M, H A' },
    				{ unit: 'minute', format: 'mm', offset: 15 }
    			],
    			minWidth: 5000,
    			fitWidth: false
    		}
    	] } = $$props;

    	let { taskContent = null } = $$props;
    	let { tableWidth = 240 } = $$props;
    	let { resizeHandleWidth = 10 } = $$props;
    	let { onTaskButtonClick = null } = $$props;
    	let { dateAdapter = new NoopSvelteGanttDateAdapter() } = $$props;
    	let { magnetUnit = 'minute' } = $$props;
    	let { magnetOffset = 15 } = $$props;
    	let magnetDuration;
    	setMagnetDuration(magnetUnit, magnetOffset);

    	function setMagnetDuration(unit, offset) {
    		if (unit && offset) {
    			$$invalidate(87, magnetDuration = getDuration(unit, offset));
    		}
    	}

    	let { columnUnit = 'minute' } = $$props;
    	let { columnOffset = 15 } = $$props;
    	let { ganttTableModules = [] } = $$props;
    	let { ganttBodyModules = [] } = $$props;
    	let { reflectOnParentRows = true } = $$props;
    	let { reflectOnChildRows = false } = $$props;
    	let { columnStrokeColor = '#efefef' } = $$props;
    	let { columnStrokeWidth = 1 } = $$props;
    	let { highlightedDurations } = $$props;
    	let { highlightColor = "#6eb859" } = $$props;
    	let { taskElementHook = null } = $$props;
    	const visibleWidth = writable(null);
    	component_subscribe($$self, visibleWidth, value => $$invalidate(24, $visibleWidth = value));
    	const visibleHeight = writable(null);
    	component_subscribe($$self, visibleHeight, value => $$invalidate(9, $visibleHeight = value));
    	const headerHeight = writable(null);
    	component_subscribe($$self, headerHeight, value => $$invalidate(22, $headerHeight = value));

    	const _width = derived([visibleWidth, _minWidth, _fitWidth], ([visible, min, stretch]) => {
    		return stretch && visible > min ? visible : min;
    	});

    	component_subscribe($$self, _width, value => $$invalidate(10, $_width = value));

    	const columnService = {
    		getColumnByDate(date) {
    			const pair = findByDate(columns, date);
    			return !pair[0] ? pair[1] : pair[0];
    		},
    		getColumnByPosition(x) {
    			const pair = findByPosition(columns, x);
    			return !pair[0] ? pair[1] : pair[0];
    		},
    		getPositionByDate(date) {
    			if (!date) return null;
    			const column = this.getColumnByDate(date);
    			let durationTo = date - column.from;
    			const position = durationTo / column.duration * column.width;

    			//multiples - skip every nth col, use other duration
    			return column.left + position;
    		},
    		getDateByPosition(x) {
    			const column = this.getColumnByPosition(x);
    			x = x - column.left;
    			let positionDuration = column.duration / column.width * x;
    			const date = column.from + positionDuration;
    			return date;
    		},
    		/**
     *
     * @param {number} date - Date
     * @returns {number} rounded date passed as parameter
     */
    		roundTo(date) {
    			let value = Math.round(date / magnetDuration) * magnetDuration;
    			return value;
    		}
    	};

    	let disableTransition = true;

    	function tickWithoutCSSTransition() {
    		return __awaiter(this, void 0, void 0, function* () {
    			$$invalidate(15, disableTransition = !disableTransition);
    			yield tick();
    			ganttElement.offsetHeight; // force a reflow
    			$$invalidate(15, disableTransition = !!disableTransition);
    		});
    	}

    	let columns;

    	function getColumnsV2(from, to, unit, offset, width) {
    		//BUG: Function is running twice on init, how to prevent it?
    		if (from instanceof Date) from = from.valueOf();

    		if (to instanceof Date) to = to.valueOf();
    		let cols = [];
    		const periods = getAllPeriods(from.valueOf(), to.valueOf(), unit, offset, highlightedDurations);
    		let left = 0;
    		let distance_point = 0;

    		periods.forEach(function (period) {
    			left = distance_point;
    			distance_point = getPositionByDate(period.to, $_from, $_to, $_width);

    			cols.push(Object.assign(
    				{
    					width: distance_point - left,
    					from: period.from,
    					to: period.to,
    					left,
    					duration: period.duration
    				},
    				period.isHighlighted && { 'bgHighlightColor': highlightColor }
    			));
    		});

    		return cols;
    	}

    	setContext('dimensions', {
    		from: _from,
    		to: _to,
    		width: _width,
    		visibleWidth,
    		visibleHeight,
    		headerHeight
    	});

    	setContext('options', {
    		dateAdapter,
    		taskElementHook,
    		taskContent,
    		rowPadding: _rowPadding,
    		rowHeight: _rowHeight,
    		resizeHandleWidth,
    		reflectOnParentRows,
    		reflectOnChildRows,
    		onTaskButtonClick
    	});

    	const hoveredRow = writable(null);
    	component_subscribe($$self, hoveredRow, value => $$invalidate(110, $hoveredRow = value));
    	const selectedRow = writable(null);
    	component_subscribe($$self, selectedRow, value => $$invalidate(111, $selectedRow = value));
    	const ganttContext = { scrollables, hoveredRow, selectedRow };
    	setContext('gantt', ganttContext);

    	onMount(() => {
    		Object.assign(ganttContext, {
    			rowContainer,
    			mainContainer,
    			mainHeaderContainer
    		});

    		api.registerEvent('tasks', 'move');
    		api.registerEvent('tasks', 'select');
    		api.registerEvent('tasks', 'switchRow');
    		api.registerEvent('tasks', 'moveEnd');
    		api.registerEvent('tasks', 'change');
    		api.registerEvent('tasks', 'changed');
    		api.registerEvent('gantt', 'viewChanged');
    		api.registerEvent('gantt', 'dateSelected');
    		api.registerEvent('tasks', 'dblclicked');
    		api.registerEvent('timeranges', 'clicked');
    		api.registerEvent('timeranges', 'resized');
    		$$invalidate(86, mounted = true);
    	});

    	onDelegatedEvent('mousedown', 'data-task-id', (event, data, target) => {
    		const taskId = +data;

    		if (isLeftClick(event) && !target.classList.contains("sg-task-reflected")) {
    			if (event.ctrlKey) {
    				selectionManager.toggleSelection(taskId, target);
    			} else {
    				selectionManager.selectSingle(taskId, target);
    			}

    			selectionManager.dispatchSelectionEvent(taskId, event);
    		}

    		api['tasks'].raise.select($taskStore.entities[taskId]);
    	});

    	onDelegatedEvent('mouseover', 'data-row-id', (event, data, target) => {
    		set_store_value(hoveredRow, $hoveredRow = +data, $hoveredRow);
    	});

    	onDelegatedEvent('click', 'data-row-id', (event, data, target) => {
    		selectionManager.unSelectTasks();

    		if ($selectedRow == +data) {
    			set_store_value(selectedRow, $selectedRow = null, $selectedRow);
    			return;
    		}

    		set_store_value(selectedRow, $selectedRow = +data, $selectedRow);
    	});

    	onDelegatedEvent('mouseleave', 'empty', (event, data, target) => {
    		set_store_value(hoveredRow, $hoveredRow = null, $hoveredRow);
    	});

    	onDestroy(() => {
    		offDelegatedEvent('click', 'data-task-id');
    		offDelegatedEvent('click', 'data-row-id');
    		offDelegatedEvent('mousedown', 'data-task-id');
    		selectionManager.unSelectTasks();
    	});

    	let __scrollTop = 0;

    	function scrollable(node) {
    		const onscroll = event => {
    			const { scrollTop, scrollLeft } = node;

    			scrollables.forEach(scrollable => {
    				if (scrollable.orientation === 'horizontal') {
    					scrollable.node.scrollLeft = scrollLeft;
    				} else {
    					scrollable.node.scrollTop = scrollTop;
    				}
    			});

    			$$invalidate(88, __scrollTop = scrollTop);
    		};

    		node.addEventListener('scroll', onscroll);

    		return {
    			destroy() {
    				node.removeEventListener('scroll', onscroll, false);
    			}
    		};
    	}

    	function horizontalScrollListener(node) {
    		scrollables.push({ node, orientation: 'horizontal' });
    	}

    	function onResize(event) {
    		$$invalidate(2, tableWidth = event.detail.left);
    	}

    	let zoomLevel = 0;
    	let zooming = false;

    	function onwheel(event) {
    		return __awaiter(this, void 0, void 0, function* () {
    			if (event.ctrlKey) {
    				event.preventDefault();
    				const prevZoomLevel = zoomLevel;

    				if (event.deltaY > 0) {
    					zoomLevel = Math.max(zoomLevel - 1, 0);
    				} else {
    					zoomLevel = Math.min(zoomLevel + 1, zoomLevels.length - 1);
    				}

    				if (prevZoomLevel != zoomLevel && zoomLevels[zoomLevel]) {
    					const options = Object.assign(
    						{
    							columnUnit,
    							columnOffset,
    							minWidth: $_minWidth
    						},
    						zoomLevels[zoomLevel]
    					);

    					const scale = options.minWidth / $_width;
    					const node = mainContainer;
    					const mousepos = getRelativePos(node, event);
    					const before = node.scrollLeft + mousepos.x;
    					const after = before * scale;
    					const scrollLeft = after - mousepos.x + node.clientWidth / 2;
    					console.log('scrollLeft', scrollLeft);
    					$$invalidate(0, columnUnit = options.columnUnit);
    					$$invalidate(43, columnOffset = options.columnOffset);
    					set_store_value(_minWidth, $_minWidth = options.minWidth, $_minWidth);
    					if (options.headers) $$invalidate(1, headers = options.headers);
    					if (options.fitWidth) set_store_value(_fitWidth, $_fitWidth = options.fitWidth, $_fitWidth);
    					api['gantt'].raise.viewChanged();
    					$$invalidate(17, zooming = true);
    					yield tick();
    					node.scrollLeft = scrollLeft;
    					$$invalidate(17, zooming = false);
    				}
    			}
    		});
    	}

    	function onDateSelected(event) {
    		set_store_value(_from, $_from = event.detail.from, $_from);
    		set_store_value(_to, $_to = event.detail.to, $_to);
    		api['gantt'].raise.dateSelected({ from: $_from, to: $_to });
    	}

    	function initRows(rowsData) {
    		//Bug: Running twice on change options
    		const rows = rowFactory.createRows(rowsData);

    		rowStore.addAll(rows);
    	}

    	function initTasks(taskData) {
    		return __awaiter(this, void 0, void 0, function* () {
    			yield tick();
    			const tasks = [];
    			const opts = { rowPadding: $_rowPadding };

    			taskData.forEach(t => {
    				const task = taskFactory.createTask(t);
    				const row = $rowStore.entities[task.model.resourceId];
    				task.reflections = [];

    				if (reflectOnChildRows && row.allChildren) {
    					row.allChildren.forEach(r => {
    						const reflectedTask = reflectTask(task, r, opts);
    						task.reflections.push(reflectedTask.model.id);
    						tasks.push(reflectedTask);
    					});
    				}

    				if (reflectOnParentRows && row.allParents.length > 0) {
    					row.allParents.forEach(r => {
    						const reflectedTask = reflectTask(task, r, opts);
    						task.reflections.push(reflectedTask.model.id);
    						tasks.push(reflectedTask);
    					});
    				}

    				tasks.push(task);
    			});

    			taskStore.addAll(tasks);
    		});
    	}

    	function initTimeRanges(timeRangeData) {
    		const timeRanges = timeRangeData.map(timeRange => {
    			return timeRangeFactory.create(timeRange);
    		});

    		timeRangeStore.addAll(timeRanges);
    	}

    	const api = new GanttApi();
    	const selectionManager = new SelectionManager();
    	const taskFactory = new TaskFactory(columnService);
    	const rowFactory = new RowFactory();
    	const dndManager = new DragDropManager(rowStore);
    	const timeRangeFactory = new TimeRangeFactory(columnService);
    	const utils = new GanttUtils();

    	setContext('services', {
    		utils,
    		api,
    		dndManager,
    		selectionManager,
    		columnService
    	});

    	function refreshTimeRanges() {
    		timeRangeStore._update(({ ids, entities }) => {
    			ids.forEach(id => {
    				const timeRange = entities[id];
    				const newLeft = columnService.getPositionByDate(timeRange.model.from) | 0;
    				const newRight = columnService.getPositionByDate(timeRange.model.to) | 0;
    				timeRange.left = newLeft;
    				timeRange.width = newRight - newLeft;
    			});

    			return { ids, entities };
    		});
    	}

    	function refreshTasks() {
    		$allTasks.forEach(task => {
    			const newLeft = columnService.getPositionByDate(task.model.from) | 0;
    			const newRight = columnService.getPositionByDate(task.model.to) | 0;
    			task.left = newLeft;
    			task.width = newRight - newLeft;
    		});

    		taskStore.refresh();
    	}

    	function getRowContainer() {
    		return rowContainer;
    	}

    	function selectTask(id) {
    		const task = $taskStore.entities[id];

    		if (task) {
    			selectionManager.selectSingle(task, document.querySelector(`data-task-id='${id}'`));
    		}
    	}

    	function unselectTasks() {
    		selectionManager.unSelectTasks();
    	}

    	function scrollToRow(id, scrollBehavior = 'auto') {
    		const { scrollTop, clientHeight } = mainContainer;
    		const index = $allRows.findIndex(r => r.model.id == id);
    		if (index === -1) return;
    		const targetTop = index * rowHeight;

    		if (targetTop < scrollTop) {
    			mainContainer.scrollTo({ top: targetTop, behavior: scrollBehavior });
    		}

    		if (targetTop > scrollTop + clientHeight) {
    			mainContainer.scrollTo({
    				top: targetTop + rowHeight - clientHeight,
    				behavior: scrollBehavior
    			});
    		}
    	}

    	function scrollToTask(id, scrollBehavior = 'auto') {
    		const { scrollLeft, scrollTop, clientWidth, clientHeight } = mainContainer;
    		const task = $taskStore.entities[id];
    		if (!task) return;
    		const targetLeft = task.left;
    		const rowIndex = $allRows.findIndex(r => r.model.id == task.model.resourceId);
    		const targetTop = rowIndex * rowHeight;

    		const options = {
    			top: undefined,
    			left: undefined,
    			behavior: scrollBehavior
    		};

    		if (targetLeft < scrollLeft) {
    			options.left = targetLeft;
    		}

    		if (targetLeft > scrollLeft + clientWidth) {
    			options.left = targetLeft + task.width - clientWidth;
    		}

    		if (targetTop < scrollTop) {
    			options.top = targetTop;
    		}

    		if (targetTop > scrollTop + clientHeight) {
    			options.top = targetTop + rowHeight - clientHeight;
    		}

    		mainContainer.scrollTo(options);
    	}

    	function updateTask(model) {
    		const task = taskFactory.createTask(model);
    		taskStore.upsert(task);
    	}

    	function updateTasks(taskModels) {
    		const tasks = taskModels.map(model => taskFactory.createTask(model));
    		taskStore.upsertAll(tasks);
    	}

    	function updateRow(model) {
    		const row = rowFactory.createRow(model, null);
    		rowStore.upsert(row);
    	}

    	function updateRows(rowModels) {
    		const rows = rowModels.map(model => rowFactory.createRow(model, null));
    		rowStore.upsertAll(rows);
    	}

    	function getRow(resourceId) {
    		return $rowStore.entities[resourceId];
    	}

    	function getTask(id) {
    		return $taskStore.entities[id];
    	}

    	function getTasks(resourceId) {
    		if ($rowTaskCache[resourceId]) {
    			return $rowTaskCache[resourceId].map(id => $taskStore.entities[id]);
    		}

    		return null;
    	}

    	let filteredRows = [];
    	let rowContainerHeight;
    	let startIndex;
    	let endIndex;
    	let paddingTop = 0;
    	let paddingBottom = 0;
    	let visibleRows = [];
    	let visibleTasks;

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			mainHeaderContainer = $$value;
    			$$invalidate(12, mainHeaderContainer);
    		});
    	}

    	function div2_elementresize_handler() {
    		$headerHeight = this.clientHeight;
    		headerHeight.set($headerHeight);
    	}

    	function div4_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			rowContainer = $$value;
    			$$invalidate(14, rowContainer);
    		});
    	}

    	function div7_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			mainContainer = $$value;
    			$$invalidate(13, mainContainer);
    		});
    	}

    	function div7_elementresize_handler() {
    		$visibleHeight = this.clientHeight;
    		visibleHeight.set($visibleHeight);
    		$visibleWidth = this.clientWidth;
    		visibleWidth.set($visibleWidth);
    	}

    	function div9_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			ganttElement = $$value;
    			$$invalidate(11, ganttElement);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(42, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ('rows' in $$new_props) $$invalidate(47, rows = $$new_props.rows);
    		if ('tasks' in $$new_props) $$invalidate(48, tasks = $$new_props.tasks);
    		if ('timeRanges' in $$new_props) $$invalidate(49, timeRanges = $$new_props.timeRanges);
    		if ('rowPadding' in $$new_props) $$invalidate(50, rowPadding = $$new_props.rowPadding);
    		if ('rowHeight' in $$new_props) $$invalidate(51, rowHeight = $$new_props.rowHeight);
    		if ('from' in $$new_props) $$invalidate(52, from = $$new_props.from);
    		if ('to' in $$new_props) $$invalidate(53, to = $$new_props.to);
    		if ('minWidth' in $$new_props) $$invalidate(54, minWidth = $$new_props.minWidth);
    		if ('fitWidth' in $$new_props) $$invalidate(55, fitWidth = $$new_props.fitWidth);
    		if ('classes' in $$new_props) $$invalidate(3, classes = $$new_props.classes);
    		if ('headers' in $$new_props) $$invalidate(1, headers = $$new_props.headers);
    		if ('zoomLevels' in $$new_props) $$invalidate(56, zoomLevels = $$new_props.zoomLevels);
    		if ('taskContent' in $$new_props) $$invalidate(57, taskContent = $$new_props.taskContent);
    		if ('tableWidth' in $$new_props) $$invalidate(2, tableWidth = $$new_props.tableWidth);
    		if ('resizeHandleWidth' in $$new_props) $$invalidate(58, resizeHandleWidth = $$new_props.resizeHandleWidth);
    		if ('onTaskButtonClick' in $$new_props) $$invalidate(59, onTaskButtonClick = $$new_props.onTaskButtonClick);
    		if ('dateAdapter' in $$new_props) $$invalidate(60, dateAdapter = $$new_props.dateAdapter);
    		if ('magnetUnit' in $$new_props) $$invalidate(61, magnetUnit = $$new_props.magnetUnit);
    		if ('magnetOffset' in $$new_props) $$invalidate(62, magnetOffset = $$new_props.magnetOffset);
    		if ('columnUnit' in $$new_props) $$invalidate(0, columnUnit = $$new_props.columnUnit);
    		if ('columnOffset' in $$new_props) $$invalidate(43, columnOffset = $$new_props.columnOffset);
    		if ('ganttTableModules' in $$new_props) $$invalidate(4, ganttTableModules = $$new_props.ganttTableModules);
    		if ('ganttBodyModules' in $$new_props) $$invalidate(5, ganttBodyModules = $$new_props.ganttBodyModules);
    		if ('reflectOnParentRows' in $$new_props) $$invalidate(63, reflectOnParentRows = $$new_props.reflectOnParentRows);
    		if ('reflectOnChildRows' in $$new_props) $$invalidate(64, reflectOnChildRows = $$new_props.reflectOnChildRows);
    		if ('columnStrokeColor' in $$new_props) $$invalidate(6, columnStrokeColor = $$new_props.columnStrokeColor);
    		if ('columnStrokeWidth' in $$new_props) $$invalidate(7, columnStrokeWidth = $$new_props.columnStrokeWidth);
    		if ('highlightedDurations' in $$new_props) $$invalidate(65, highlightedDurations = $$new_props.highlightedDurations);
    		if ('highlightColor' in $$new_props) $$invalidate(66, highlightColor = $$new_props.highlightColor);
    		if ('taskElementHook' in $$new_props) $$invalidate(67, taskElementHook = $$new_props.taskElementHook);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[1] & /*rows*/ 65536 | $$self.$$.dirty[2] & /*mounted*/ 16777216) {
    			if (mounted) initRows(rows);
    		}

    		if ($$self.$$.dirty[1] & /*tasks*/ 131072 | $$self.$$.dirty[2] & /*mounted*/ 16777216) {
    			if (mounted) initTasks(tasks);
    		}

    		if ($$self.$$.dirty[1] & /*timeRanges*/ 262144 | $$self.$$.dirty[2] & /*mounted*/ 16777216) {
    			if (mounted) initTimeRanges(timeRanges);
    		}

    		if ($$self.$$.dirty[1] & /*rowHeight*/ 1048576) {
    			set_store_value(_rowHeight, $_rowHeight = rowHeight, $_rowHeight);
    		}

    		if ($$self.$$.dirty[1] & /*rowPadding*/ 524288) {
    			set_store_value(_rowPadding, $_rowPadding = rowPadding, $_rowPadding);
    		}

    		if ($$self.$$.dirty[1] & /*from*/ 2097152) {
    			set_store_value(_from, $_from = toDateNum(from), $_from);
    		}

    		if ($$self.$$.dirty[1] & /*to*/ 4194304) {
    			set_store_value(_to, $_to = toDateNum(to), $_to);
    		}

    		if ($$self.$$.dirty[1] & /*minWidth, fitWidth*/ 25165824) {
    			{
    				set_store_value(_minWidth, $_minWidth = minWidth, $_minWidth);
    				set_store_value(_fitWidth, $_fitWidth = fitWidth, $_fitWidth);
    			}
    		}

    		if ($$self.$$.dirty[1] & /*magnetUnit*/ 1073741824 | $$self.$$.dirty[2] & /*magnetOffset*/ 1) {
    			setMagnetDuration(magnetUnit, magnetOffset);
    		}

    		if ($$self.$$.dirty[0] & /*columnUnit, $_width*/ 1025 | $$self.$$.dirty[1] & /*columnOffset*/ 4096 | $$self.$$.dirty[3] & /*$_from, $_to*/ 24) {
    			{
    				$$invalidate(16, columns = getColumnsV2($_from, $_to, columnUnit, columnOffset));
    				tickWithoutCSSTransition();
    				refreshTimeRanges();
    				refreshTasks();
    			}
    		}

    		if ($$self.$$.dirty[3] & /*$_rowPadding, $rowStore*/ 36) {
    			{
    				$$invalidate(44, taskFactory.rowPadding = $_rowPadding, taskFactory);
    				$$invalidate(44, taskFactory.rowEntities = $rowStore.entities, taskFactory);
    			}
    		}

    		if ($$self.$$.dirty[1] & /*rowHeight*/ 1048576) {
    			$$invalidate(45, rowFactory.rowHeight = rowHeight, rowFactory);
    		}

    		if ($$self.$$.dirty[0] & /*$_width*/ 1024 | $$self.$$.dirty[1] & /*magnetUnit*/ 1073741824 | $$self.$$.dirty[2] & /*magnetOffset, magnetDuration*/ 33554433 | $$self.$$.dirty[3] & /*$_from, $_to*/ 24) {
    			{
    				$$invalidate(46, utils.from = $_from, utils);
    				$$invalidate(46, utils.to = $_to, utils);
    				$$invalidate(46, utils.width = $_width, utils);
    				$$invalidate(46, utils.magnetOffset = magnetOffset, utils);
    				$$invalidate(46, utils.magnetUnit = magnetUnit, utils);
    				$$invalidate(46, utils.magnetDuration = magnetDuration, utils);
    			} //utils.to = columns[columns.length - 1].to;
    			//utils.width = columns.length * columns[columns.length - 1].width;
    		}

    		if ($$self.$$.dirty[3] & /*$allRows*/ 2) {
    			$$invalidate(89, filteredRows = $allRows.filter(row => !row.hidden));
    		}

    		if ($$self.$$.dirty[1] & /*rowHeight*/ 1048576 | $$self.$$.dirty[2] & /*filteredRows*/ 134217728) {
    			$$invalidate(18, rowContainerHeight = filteredRows.length * rowHeight);
    		}

    		if ($$self.$$.dirty[1] & /*rowHeight*/ 1048576 | $$self.$$.dirty[2] & /*__scrollTop*/ 67108864) {
    			$$invalidate(90, startIndex = Math.floor(__scrollTop / rowHeight));
    		}

    		if ($$self.$$.dirty[0] & /*$visibleHeight*/ 512 | $$self.$$.dirty[1] & /*rowHeight*/ 1048576 | $$self.$$.dirty[2] & /*startIndex, filteredRows*/ 402653184) {
    			$$invalidate(91, endIndex = Math.min(startIndex + Math.ceil($visibleHeight / rowHeight), filteredRows.length - 1));
    		}

    		if ($$self.$$.dirty[1] & /*rowHeight*/ 1048576 | $$self.$$.dirty[2] & /*startIndex*/ 268435456) {
    			$$invalidate(19, paddingTop = startIndex * rowHeight);
    		}

    		if ($$self.$$.dirty[1] & /*rowHeight*/ 1048576 | $$self.$$.dirty[2] & /*filteredRows, endIndex*/ 671088640) {
    			$$invalidate(20, paddingBottom = (filteredRows.length - endIndex - 1) * rowHeight);
    		}

    		if ($$self.$$.dirty[2] & /*filteredRows, startIndex, endIndex*/ 939524096) {
    			$$invalidate(8, visibleRows = filteredRows.slice(startIndex, endIndex + 1));
    		}

    		if ($$self.$$.dirty[0] & /*visibleRows*/ 256 | $$self.$$.dirty[2] & /*$taskStore*/ 1073741824 | $$self.$$.dirty[3] & /*$rowTaskCache*/ 1) {
    			{
    				const tasks = [];

    				for (let i = 0; i < visibleRows.length; i++) {
    					const row = visibleRows[i];

    					if ($rowTaskCache[row.model.id]) {
    						for (let j = 0; j < $rowTaskCache[row.model.id].length; j++) {
    							const id = $rowTaskCache[row.model.id][j];
    							tasks.push($taskStore.entities[id]);
    						}
    					}
    				}

    				$$invalidate(21, visibleTasks = tasks);
    			}
    		}
    	};

    	return [
    		columnUnit,
    		headers,
    		tableWidth,
    		classes,
    		ganttTableModules,
    		ganttBodyModules,
    		columnStrokeColor,
    		columnStrokeWidth,
    		visibleRows,
    		$visibleHeight,
    		$_width,
    		ganttElement,
    		mainHeaderContainer,
    		mainContainer,
    		rowContainer,
    		disableTransition,
    		columns,
    		zooming,
    		rowContainerHeight,
    		paddingTop,
    		paddingBottom,
    		visibleTasks,
    		$headerHeight,
    		$allTimeRanges,
    		$visibleWidth,
    		_rowHeight,
    		_rowPadding,
    		_from,
    		_to,
    		_minWidth,
    		_fitWidth,
    		visibleWidth,
    		visibleHeight,
    		headerHeight,
    		_width,
    		hoveredRow,
    		selectedRow,
    		scrollable,
    		horizontalScrollListener,
    		onResize,
    		onwheel,
    		onDateSelected,
    		$$restProps,
    		columnOffset,
    		taskFactory,
    		rowFactory,
    		utils,
    		rows,
    		tasks,
    		timeRanges,
    		rowPadding,
    		rowHeight,
    		from,
    		to,
    		minWidth,
    		fitWidth,
    		zoomLevels,
    		taskContent,
    		resizeHandleWidth,
    		onTaskButtonClick,
    		dateAdapter,
    		magnetUnit,
    		magnetOffset,
    		reflectOnParentRows,
    		reflectOnChildRows,
    		highlightedDurations,
    		highlightColor,
    		taskElementHook,
    		columnService,
    		api,
    		dndManager,
    		timeRangeFactory,
    		refreshTimeRanges,
    		refreshTasks,
    		getRowContainer,
    		selectTask,
    		unselectTasks,
    		scrollToRow,
    		scrollToTask,
    		updateTask,
    		updateTasks,
    		updateRow,
    		updateRows,
    		getRow,
    		getTask,
    		getTasks,
    		mounted,
    		magnetDuration,
    		__scrollTop,
    		filteredRows,
    		startIndex,
    		endIndex,
    		$taskStore,
    		$rowTaskCache,
    		$allRows,
    		$rowStore,
    		$_to,
    		$_from,
    		$_rowPadding,
    		div2_binding,
    		div2_elementresize_handler,
    		div4_binding,
    		div7_binding,
    		div7_elementresize_handler,
    		div9_binding
    	];
    }

    class Gantt extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$5,
    			create_fragment$5,
    			safe_not_equal,
    			{
    				rows: 47,
    				tasks: 48,
    				timeRanges: 49,
    				rowPadding: 50,
    				rowHeight: 51,
    				from: 52,
    				to: 53,
    				minWidth: 54,
    				fitWidth: 55,
    				classes: 3,
    				headers: 1,
    				zoomLevels: 56,
    				taskContent: 57,
    				tableWidth: 2,
    				resizeHandleWidth: 58,
    				onTaskButtonClick: 59,
    				dateAdapter: 60,
    				magnetUnit: 61,
    				magnetOffset: 62,
    				columnUnit: 0,
    				columnOffset: 43,
    				ganttTableModules: 4,
    				ganttBodyModules: 5,
    				reflectOnParentRows: 63,
    				reflectOnChildRows: 64,
    				columnStrokeColor: 6,
    				columnStrokeWidth: 7,
    				highlightedDurations: 65,
    				highlightColor: 66,
    				taskElementHook: 67,
    				columnService: 68,
    				api: 69,
    				taskFactory: 44,
    				rowFactory: 45,
    				dndManager: 70,
    				timeRangeFactory: 71,
    				utils: 46,
    				refreshTimeRanges: 72,
    				refreshTasks: 73,
    				getRowContainer: 74,
    				selectTask: 75,
    				unselectTasks: 76,
    				scrollToRow: 77,
    				scrollToTask: 78,
    				updateTask: 79,
    				updateTasks: 80,
    				updateRow: 81,
    				updateRows: 82,
    				getRow: 83,
    				getTask: 84,
    				getTasks: 85
    			},
    			null,
    			[-1, -1, -1, -1, -1]
    		);
    	}

    	get columnService() {
    		return this.$$.ctx[68];
    	}

    	get api() {
    		return this.$$.ctx[69];
    	}

    	get taskFactory() {
    		return this.$$.ctx[44];
    	}

    	get rowFactory() {
    		return this.$$.ctx[45];
    	}

    	get dndManager() {
    		return this.$$.ctx[70];
    	}

    	get timeRangeFactory() {
    		return this.$$.ctx[71];
    	}

    	get utils() {
    		return this.$$.ctx[46];
    	}

    	get refreshTimeRanges() {
    		return this.$$.ctx[72];
    	}

    	get refreshTasks() {
    		return this.$$.ctx[73];
    	}

    	get getRowContainer() {
    		return this.$$.ctx[74];
    	}

    	get selectTask() {
    		return this.$$.ctx[75];
    	}

    	get unselectTasks() {
    		return this.$$.ctx[76];
    	}

    	get scrollToRow() {
    		return this.$$.ctx[77];
    	}

    	get scrollToTask() {
    		return this.$$.ctx[78];
    	}

    	get updateTask() {
    		return this.$$.ctx[79];
    	}

    	get updateTasks() {
    		return this.$$.ctx[80];
    	}

    	get updateRow() {
    		return this.$$.ctx[81];
    	}

    	get updateRows() {
    		return this.$$.ctx[82];
    	}

    	get getRow() {
    		return this.$$.ctx[83];
    	}

    	get getTask() {
    		return this.$$.ctx[84];
    	}

    	get getTasks() {
    		return this.$$.ctx[85];
    	}
    }

    var css_248z$4 = ".sg-tree-expander.svelte-1tk4vqn{cursor:pointer;min-width:1.4em;display:flex;justify-content:center;align-items:center}.sg-cell-inner.svelte-1tk4vqn{display:flex}";
    styleInject(css_248z$4);

    /* src/modules/table/TableTreeCell.svelte generated by Svelte v3.55.0 */

    function create_if_block$2(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*row*/ ctx[0].expanded) return create_if_block_1$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			if_block.c();
    			attr(div, "class", "sg-tree-expander svelte-1tk4vqn");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if_block.m(div, null);

    			if (!mounted) {
    				dispose = listen(div, "click", /*onExpandToggle*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (19:12) {:else}
    function create_else_block$1(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-angle-right");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (17:12) {#if row.expanded}
    function create_if_block_1$1(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-angle-down");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let div;
    	let t;
    	let current;
    	let if_block = /*row*/ ctx[0].children && create_if_block$2(ctx);
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			if (default_slot) default_slot.c();
    			attr(div, "class", "sg-cell-inner svelte-1tk4vqn");
    			set_style(div, "padding-left", /*row*/ ctx[0].childLevel * 3 + "em");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append(div, t);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*row*/ ctx[0].children) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(div, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*row*/ 1) {
    				set_style(div, "padding-left", /*row*/ ctx[0].childLevel * 3 + "em");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { row } = $$props;
    	const dispatch = createEventDispatcher();

    	function onExpandToggle() {
    		if (row.expanded) {
    			dispatch('rowCollapsed', { row });
    		} else {
    			dispatch('rowExpanded', { row });
    		}
    	}

    	$$self.$$set = $$props => {
    		if ('row' in $$props) $$invalidate(0, row = $$props.row);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [row, onExpandToggle, $$scope, slots];
    }

    class TableTreeCell extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { row: 0 });
    	}
    }

    var css_248z$3 = ".sg-table-row.svelte-ffcwbe{display:inline-flex;min-width:100%;align-items:stretch;position:relative;font-weight:400;font-size:14px}.sg-table-cell.svelte-ffcwbe{border-left:1px solid #eee}.sg-table-body-cell.svelte-ffcwbe{border-bottom:#efefef 1px solid;background-color:#fff;font-weight:bold}.sg-resource-image.svelte-ffcwbe{width:2.4em;height:2.4em;border-radius:50%;margin-right:.6em;background:#047c69}.sg-resource-info.svelte-ffcwbe{flex:1;height:100%;display:flex;flex-direction:row;align-items:center}.sg-table-icon.svelte-ffcwbe{margin-right:0.5em}";
    styleInject(css_248z$3);

    /* src/modules/table/TableRow.svelte generated by Svelte v3.55.0 */

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (42:12) {:else}
    function create_else_block_1(ctx) {
    	let t;
    	let if_block1_anchor;
    	let if_block0 = /*row*/ ctx[1].model.iconClass && create_if_block_7(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*row*/ ctx[1].model.headerHtml) return create_if_block_4;
    		if (/*header*/ ctx[12].renderer) return create_if_block_5;
    		if (/*header*/ ctx[12].type === 'resourceInfo') return create_if_block_6;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block1 = current_block_type(ctx);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t, anchor);
    			if_block1.m(target, anchor);
    			insert(target, if_block1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*row*/ ctx[1].model.iconClass) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_7(ctx);
    					if_block0.c();
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t);
    			if_block1.d(detaching);
    			if (detaching) detach(if_block1_anchor);
    		}
    	};
    }

    // (26:12) {#if header.type == 'tree'}
    function create_if_block$1(ctx) {
    	let tabletreecell;
    	let current;

    	tabletreecell = new TableTreeCell({
    			props: {
    				row: /*row*/ ctx[1],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	tabletreecell.$on("rowCollapsed", /*rowCollapsed_handler*/ ctx[8]);
    	tabletreecell.$on("rowExpanded", /*rowExpanded_handler*/ ctx[9]);

    	return {
    		c() {
    			create_component(tabletreecell.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tabletreecell, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tabletreecell_changes = {};
    			if (dirty & /*row*/ 2) tabletreecell_changes.row = /*row*/ ctx[1];

    			if (dirty & /*$$scope, row, headers*/ 32771) {
    				tabletreecell_changes.$$scope = { dirty, ctx };
    			}

    			tabletreecell.$set(tabletreecell_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tabletreecell.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tabletreecell.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tabletreecell, detaching);
    		}
    	};
    }

    // (43:16) {#if row.model.iconClass}
    function create_if_block_7(ctx) {
    	let div;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			div = element("div");
    			i = element("i");
    			attr(i, "class", i_class_value = "" + (null_to_empty(/*row*/ ctx[1].model.iconClass) + " svelte-ffcwbe"));
    			attr(div, "class", "sg-table-icon svelte-ffcwbe");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*row*/ 2 && i_class_value !== (i_class_value = "" + (null_to_empty(/*row*/ ctx[1].model.iconClass) + " svelte-ffcwbe"))) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (58:16) {:else}
    function create_else_block_2(ctx) {
    	let t_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*row, headers*/ 3 && t_value !== (t_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (53:57) 
    function create_if_block_6(ctx) {
    	let img;
    	let img_src_value;
    	let t0;
    	let div;
    	let t1_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "";
    	let t1;

    	return {
    		c() {
    			img = element("img");
    			t0 = space();
    			div = element("div");
    			t1 = text(t1_value);
    			attr(img, "class", "sg-resource-image svelte-ffcwbe");
    			if (!src_url_equal(img.src, img_src_value = /*row*/ ctx[1].model.imageSrc)) attr(img, "src", img_src_value);
    			attr(img, "alt", "");
    			attr(div, "class", "sg-resource-title");
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);
    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			append(div, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*row*/ 2 && !src_url_equal(img.src, img_src_value = /*row*/ ctx[1].model.imageSrc)) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*row, headers*/ 3 && t1_value !== (t1_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(img);
    			if (detaching) detach(t0);
    			if (detaching) detach(div);
    		}
    	};
    }

    // (51:42) 
    function create_if_block_5(ctx) {
    	let html_tag;
    	let raw_value = /*header*/ ctx[12].renderer(/*row*/ ctx[1]) + "";
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*headers, row*/ 3 && raw_value !== (raw_value = /*header*/ ctx[12].renderer(/*row*/ ctx[1]) + "")) html_tag.p(raw_value);
    		},
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    // (49:16) {#if row.model.headerHtml}
    function create_if_block_4(ctx) {
    	let html_tag;
    	let raw_value = /*row*/ ctx[1].model.headerHtml + "";
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*row*/ 2 && raw_value !== (raw_value = /*row*/ ctx[1].model.headerHtml + "")) html_tag.p(raw_value);
    		},
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    // (28:20) {#if row.model.iconClass}
    function create_if_block_3(ctx) {
    	let div;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			div = element("div");
    			i = element("i");
    			attr(i, "class", i_class_value = "" + (null_to_empty(/*row*/ ctx[1].model.iconClass) + " svelte-ffcwbe"));
    			attr(div, "class", "sg-table-icon svelte-ffcwbe");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*row*/ 2 && i_class_value !== (i_class_value = "" + (null_to_empty(/*row*/ ctx[1].model.iconClass) + " svelte-ffcwbe"))) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (38:20) {:else}
    function create_else_block(ctx) {
    	let t_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*row, headers*/ 3 && t_value !== (t_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (36:46) 
    function create_if_block_2(ctx) {
    	let html_tag;
    	let raw_value = /*header*/ ctx[12].renderer(/*row*/ ctx[1]) + "";
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*headers, row*/ 3 && raw_value !== (raw_value = /*header*/ ctx[12].renderer(/*row*/ ctx[1]) + "")) html_tag.p(raw_value);
    		},
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    // (34:20) {#if row.model.headerHtml}
    function create_if_block_1(ctx) {
    	let html_tag;
    	let raw_value = /*row*/ ctx[1].model.headerHtml + "";
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*row*/ 2 && raw_value !== (raw_value = /*row*/ ctx[1].model.headerHtml + "")) html_tag.p(raw_value);
    		},
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    // (27:16) <TableTreeCell on:rowCollapsed on:rowExpanded {row}>
    function create_default_slot(ctx) {
    	let t;
    	let if_block1_anchor;
    	let if_block0 = /*row*/ ctx[1].model.iconClass && create_if_block_3(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*row*/ ctx[1].model.headerHtml) return create_if_block_1;
    		if (/*header*/ ctx[12].renderer) return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block1 = current_block_type(ctx);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t, anchor);
    			if_block1.m(target, anchor);
    			insert(target, if_block1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*row*/ ctx[1].model.iconClass) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			}
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t);
    			if_block1.d(detaching);
    			if (detaching) detach(if_block1_anchor);
    		}
    	};
    }

    // (24:4) {#each headers as header}
    function create_each_block$2(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let t;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*header*/ ctx[12].type == 'tree') return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			div = element("div");
    			if_block.c();
    			t = space();
    			attr(div, "class", "sg-table-body-cell sg-table-cell svelte-ffcwbe");
    			set_style(div, "width", /*header*/ ctx[12].width + "px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			append(div, t);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, t);
    			}

    			if (!current || dirty & /*headers*/ 1) {
    				set_style(div, "width", /*header*/ ctx[12].width + "px");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let div;
    	let div_data_row_id_value;
    	let div_class_value;
    	let current;
    	let each_value = /*headers*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "data-row-id", div_data_row_id_value = /*row*/ ctx[1].model.id);
    			set_style(div, "height", /*$rowHeight*/ ctx[2] + "px");
    			attr(div, "class", div_class_value = "sg-table-row " + (/*row*/ ctx[1].model.classes || '') + " svelte-ffcwbe");
    			toggle_class(div, "sg-row-expanded", /*row*/ ctx[1].expanded);
    			toggle_class(div, "sg-hover", /*$hoveredRow*/ ctx[3] == /*row*/ ctx[1].model.id);
    			toggle_class(div, "sg-selected", /*$selectedRow*/ ctx[4] == /*row*/ ctx[1].model.id);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*headers, row*/ 3) {
    				each_value = /*headers*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*row*/ 2 && div_data_row_id_value !== (div_data_row_id_value = /*row*/ ctx[1].model.id)) {
    				attr(div, "data-row-id", div_data_row_id_value);
    			}

    			if (!current || dirty & /*$rowHeight*/ 4) {
    				set_style(div, "height", /*$rowHeight*/ ctx[2] + "px");
    			}

    			if (!current || dirty & /*row*/ 2 && div_class_value !== (div_class_value = "sg-table-row " + (/*row*/ ctx[1].model.classes || '') + " svelte-ffcwbe")) {
    				attr(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*row, row*/ 2) {
    				toggle_class(div, "sg-row-expanded", /*row*/ ctx[1].expanded);
    			}

    			if (!current || dirty & /*row, $hoveredRow, row*/ 10) {
    				toggle_class(div, "sg-hover", /*$hoveredRow*/ ctx[3] == /*row*/ ctx[1].model.id);
    			}

    			if (!current || dirty & /*row, $selectedRow, row*/ 18) {
    				toggle_class(div, "sg-selected", /*$selectedRow*/ ctx[4] == /*row*/ ctx[1].model.id);
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $rowHeight;
    	let $hoveredRow;
    	let $selectedRow;
    	let { headers = null } = $$props;
    	let { row = null } = $$props;
    	const { rowHeight } = getContext('options');
    	component_subscribe($$self, rowHeight, value => $$invalidate(2, $rowHeight = value));
    	const { hoveredRow, selectedRow } = getContext('gantt');
    	component_subscribe($$self, hoveredRow, value => $$invalidate(3, $hoveredRow = value));
    	component_subscribe($$self, selectedRow, value => $$invalidate(4, $selectedRow = value));
    	const dispatch = createEventDispatcher();

    	onMount(() => {
    		if (row.model.expanded == false) dispatch('rowCollapsed', { row });
    	});

    	function rowCollapsed_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function rowExpanded_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('headers' in $$props) $$invalidate(0, headers = $$props.headers);
    		if ('row' in $$props) $$invalidate(1, row = $$props.row);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*row*/ 2) {
    			{
    				row.parent
    				? `padding-left: ${row.childLevel * 3}em;`
    				: '';
    			}
    		}
    	};

    	return [
    		headers,
    		row,
    		$rowHeight,
    		$hoveredRow,
    		$selectedRow,
    		rowHeight,
    		hoveredRow,
    		selectedRow,
    		rowCollapsed_handler,
    		rowExpanded_handler
    	];
    }

    class TableRow extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { headers: 0, row: 1 });
    	}
    }

    var css_248z$2 = ".bottom-scrollbar-visible.svelte-87uanl{padding-bottom:17px}.sg-table.svelte-87uanl{overflow-x:auto;display:flex;flex-direction:column}.sg-table-scroller.svelte-87uanl{width:100%;border-bottom:1px solid #efefef;overflow-y:hidden}.sg-table-header.svelte-87uanl{display:flex;align-items:stretch;overflow:hidden;border-bottom:#efefef 1px solid;background-color:#fbfbfb}.sg-table-body.svelte-87uanl{display:flex;flex:1 1 0;width:100%;overflow-y:hidden}.sg-table-header-cell.svelte-87uanl{font-size:14px;font-weight:400}.sg-table-cell{white-space:nowrap;overflow:hidden;display:flex;align-items:center;flex-shrink:0;padding:0 .5em;height:100%}.sg-table-cell:last-child{flex-grow:1}";
    styleInject(css_248z$2);

    /* src/modules/table/Table.svelte generated by Svelte v3.55.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[33] = list[i];
    	return child_ctx;
    }

    // (97:8) {#each tableHeaders as header}
    function create_each_block_1(ctx) {
    	let div;
    	let t0_value = /*header*/ ctx[33].title + "";
    	let t0;
    	let t1;

    	return {
    		c() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr(div, "class", "sg-table-header-cell sg-table-cell svelte-87uanl");
    			set_style(div, "width", /*header*/ ctx[33].width + "px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*tableHeaders*/ 32 && t0_value !== (t0_value = /*header*/ ctx[33].title + "")) set_data(t0, t0_value);

    			if (dirty[0] & /*tableHeaders*/ 32) {
    				set_style(div, "width", /*header*/ ctx[33].width + "px");
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (107:16) {#each visibleRows as row}
    function create_each_block$1(ctx) {
    	let tablerow;
    	let current;

    	tablerow = new TableRow({
    			props: {
    				row: /*row*/ ctx[30],
    				headers: /*tableHeaders*/ ctx[5]
    			}
    		});

    	tablerow.$on("rowExpanded", /*onRowExpanded*/ ctx[15]);
    	tablerow.$on("rowCollapsed", /*onRowCollapsed*/ ctx[16]);

    	return {
    		c() {
    			create_component(tablerow.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tablerow, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tablerow_changes = {};
    			if (dirty[0] & /*visibleRows*/ 16) tablerow_changes.row = /*row*/ ctx[30];
    			if (dirty[0] & /*tableHeaders*/ 32) tablerow_changes.headers = /*tableHeaders*/ ctx[5];
    			tablerow.$set(tablerow_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tablerow.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tablerow.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tablerow, detaching);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let div4;
    	let div0;
    	let t;
    	let div3;
    	let div2;
    	let div1;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*tableHeaders*/ ctx[5];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*visibleRows*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div4 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t = space();
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div0, "class", "sg-table-header svelte-87uanl");
    			set_style(div0, "height", /*$headerHeight*/ ctx[8] + "px");
    			attr(div1, "class", "sg-table-rows svelte-87uanl");
    			set_style(div1, "padding-top", /*paddingTop*/ ctx[1] + "px");
    			set_style(div1, "padding-bottom", /*paddingBottom*/ ctx[2] + "px");
    			set_style(div1, "height", /*rowContainerHeight*/ ctx[3] + "px");
    			attr(div2, "class", "sg-table-scroller svelte-87uanl");
    			attr(div3, "class", "sg-table-body svelte-87uanl");
    			toggle_class(div3, "bottom-scrollbar-visible", /*bottomScrollbarVisible*/ ctx[7]);
    			attr(div4, "class", "sg-table sg-view svelte-87uanl");
    			set_style(div4, "width", /*tableWidth*/ ctx[0] + "px");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			/*div0_binding*/ ctx[20](div0);
    			append(div4, t);
    			append(div4, div3);
    			append(div3, div2);
    			append(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(/*scrollListener*/ ctx[14].call(null, div2));
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*tableHeaders*/ 32) {
    				each_value_1 = /*tableHeaders*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (!current || dirty[0] & /*$headerHeight*/ 256) {
    				set_style(div0, "height", /*$headerHeight*/ ctx[8] + "px");
    			}

    			if (dirty[0] & /*visibleRows, tableHeaders, onRowExpanded, onRowCollapsed*/ 98352) {
    				each_value = /*visibleRows*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty[0] & /*paddingTop*/ 2) {
    				set_style(div1, "padding-top", /*paddingTop*/ ctx[1] + "px");
    			}

    			if (!current || dirty[0] & /*paddingBottom*/ 4) {
    				set_style(div1, "padding-bottom", /*paddingBottom*/ ctx[2] + "px");
    			}

    			if (!current || dirty[0] & /*rowContainerHeight*/ 8) {
    				set_style(div1, "height", /*rowContainerHeight*/ ctx[3] + "px");
    			}

    			if (!current || dirty[0] & /*bottomScrollbarVisible*/ 128) {
    				toggle_class(div3, "bottom-scrollbar-visible", /*bottomScrollbarVisible*/ ctx[7]);
    			}

    			if (!current || dirty[0] & /*tableWidth*/ 1) {
    				set_style(div4, "width", /*tableWidth*/ ctx[0] + "px");
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div4);
    			destroy_each(each_blocks_1, detaching);
    			/*div0_binding*/ ctx[20](null);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function hide(children) {
    	children.forEach(row => {
    		if (row.children) hide(row.children);
    		row.hidden = true;
    	});
    }

    function show(children, hidden = false) {
    	children.forEach(row => {
    		if (row.children) show(row.children, !row.expanded);
    		row.hidden = hidden;
    	});
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $visibleWidth;
    	let $width;
    	let $rowPadding;
    	let $taskStore;
    	let $rowStore;
    	let $rowHeight;
    	let $headerHeight;
    	component_subscribe($$self, taskStore, $$value => $$invalidate(22, $taskStore = $$value));
    	component_subscribe($$self, rowStore, $$value => $$invalidate(23, $rowStore = $$value));
    	const dispatch = createEventDispatcher();
    	let { tableWidth } = $$props;
    	let { paddingTop } = $$props;
    	let { paddingBottom } = $$props;
    	let { rowContainerHeight } = $$props;
    	let { visibleRows } = $$props;

    	let { tableHeaders = [
    		{
    			title: 'Name',
    			property: 'label',
    			width: 100
    		}
    	] } = $$props;

    	const { from, to, width, visibleWidth, headerHeight } = getContext('dimensions');
    	component_subscribe($$self, width, value => $$invalidate(19, $width = value));
    	component_subscribe($$self, visibleWidth, value => $$invalidate(18, $visibleWidth = value));
    	component_subscribe($$self, headerHeight, value => $$invalidate(8, $headerHeight = value));
    	const { rowPadding, rowHeight } = getContext('options');
    	component_subscribe($$self, rowPadding, value => $$invalidate(21, $rowPadding = value));
    	component_subscribe($$self, rowHeight, value => $$invalidate(24, $rowHeight = value));

    	onMount(() => {
    		dispatch('init', { module: this });
    	});

    	const { scrollables } = getContext('gantt');
    	let headerContainer;

    	function scrollListener(node) {
    		scrollables.push({ node, orientation: "vertical" });

    		node.addEventListener("scroll", event => {
    			$$invalidate(6, headerContainer.scrollLeft = node.scrollLeft, headerContainer);
    		});

    		return {
    			destroy() {
    				node.removeEventListener("scroll");
    			}
    		};
    	}

    	let scrollWidth;

    	function onRowExpanded(event) {
    		const row = event.detail.row;
    		row.expanded = true;
    		if (row.children) show(row.children);
    		updateYPositions();
    	}

    	function onRowCollapsed(event) {
    		const row = event.detail.row;
    		row.expanded = false;
    		if (row.children) hide(row.children);
    		updateYPositions();
    	}

    	function updateYPositions() {
    		let y = 0;

    		$rowStore.ids.forEach(id => {
    			const row = $rowStore.entities[id];

    			if (!row.hidden) {
    				set_store_value(rowStore, $rowStore.entities[id].y = y, $rowStore);
    				y += $rowHeight;
    			}
    		});

    		$taskStore.ids.forEach(id => {
    			const task = $taskStore.entities[id];
    			const row = $rowStore.entities[task.model.resourceId];
    			set_store_value(taskStore, $taskStore.entities[id].top = row.y + $rowPadding, $taskStore);
    		});
    	}

    	// if gantt displays a bottom scrollbar and table does not, we need to pad out the table
    	let bottomScrollbarVisible;

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			headerContainer = $$value;
    			$$invalidate(6, headerContainer);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('tableWidth' in $$props) $$invalidate(0, tableWidth = $$props.tableWidth);
    		if ('paddingTop' in $$props) $$invalidate(1, paddingTop = $$props.paddingTop);
    		if ('paddingBottom' in $$props) $$invalidate(2, paddingBottom = $$props.paddingBottom);
    		if ('rowContainerHeight' in $$props) $$invalidate(3, rowContainerHeight = $$props.rowContainerHeight);
    		if ('visibleRows' in $$props) $$invalidate(4, visibleRows = $$props.visibleRows);
    		if ('tableHeaders' in $$props) $$invalidate(5, tableHeaders = $$props.tableHeaders);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*tableHeaders*/ 32) {
    			{
    				let sum = 0;

    				tableHeaders.forEach(header => {
    					sum += header.width;
    				});

    				$$invalidate(17, scrollWidth = sum);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*$width, $visibleWidth, scrollWidth, tableWidth*/ 917505) {
    			{
    				$$invalidate(7, bottomScrollbarVisible = $width > $visibleWidth && scrollWidth <= tableWidth);
    			}
    		}
    	};

    	return [
    		tableWidth,
    		paddingTop,
    		paddingBottom,
    		rowContainerHeight,
    		visibleRows,
    		tableHeaders,
    		headerContainer,
    		bottomScrollbarVisible,
    		$headerHeight,
    		width,
    		visibleWidth,
    		headerHeight,
    		rowPadding,
    		rowHeight,
    		scrollListener,
    		onRowExpanded,
    		onRowCollapsed,
    		scrollWidth,
    		$visibleWidth,
    		$width,
    		div0_binding
    	];
    }

    class Table extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$2,
    			create_fragment$2,
    			safe_not_equal,
    			{
    				tableWidth: 0,
    				paddingTop: 1,
    				paddingBottom: 2,
    				rowContainerHeight: 3,
    				visibleRows: 4,
    				tableHeaders: 5
    			},
    			null,
    			[-1, -1]
    		);
    	}
    }

    var SvelteGanttTable = Table;

    var css_248z$1 = ".sg-dependency.svelte-12syssu{position:absolute;width:100%;height:100%}.arrow.svelte-12syssu{position:absolute;left:0px;pointer-events:none}.select-area.svelte-12syssu{pointer-events:visible;position:absolute}";
    styleInject(css_248z$1);

    /* src/modules/dependencies/Dependency.svelte generated by Svelte v3.55.0 */

    function create_if_block(ctx) {
    	let div;
    	let svg;
    	let path0;
    	let path1;

    	return {
    		c() {
    			div = element("div");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr(path0, "class", "select-area svelte-12syssu");
    			attr(path0, "d", /*path*/ ctx[6]);
    			attr(path0, "stroke", /*stroke*/ ctx[1]);
    			attr(path0, "stroke-width", /*strokeWidth*/ ctx[2]);
    			attr(path0, "fill", "transparent");
    			attr(path1, "d", /*arrowPath*/ ctx[5]);
    			attr(path1, "fill", /*stroke*/ ctx[1]);
    			attr(svg, "class", "arrow svelte-12syssu");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "shape-rendering", "crispEdges");
    			attr(svg, "height", "100%");
    			attr(svg, "width", "100%");
    			attr(div, "class", "sg-dependency svelte-12syssu");
    			set_style(div, "left", "0");
    			set_style(div, "top", "0");
    			attr(div, "data-dependency-id", /*id*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, svg);
    			append(svg, path0);
    			append(svg, path1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*path*/ 64) {
    				attr(path0, "d", /*path*/ ctx[6]);
    			}

    			if (dirty & /*stroke*/ 2) {
    				attr(path0, "stroke", /*stroke*/ ctx[1]);
    			}

    			if (dirty & /*strokeWidth*/ 4) {
    				attr(path0, "stroke-width", /*strokeWidth*/ ctx[2]);
    			}

    			if (dirty & /*arrowPath*/ 32) {
    				attr(path1, "d", /*arrowPath*/ ctx[5]);
    			}

    			if (dirty & /*stroke*/ 2) {
    				attr(path1, "fill", /*stroke*/ ctx[1]);
    			}

    			if (dirty & /*id*/ 1) {
    				attr(div, "data-dependency-id", /*id*/ ctx[0]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let if_block = (!/*isFromRowHidden*/ ctx[3] && !/*isToRowHidden*/ ctx[4] || /*isFromRowHidden*/ ctx[3] !== /*isToRowHidden*/ ctx[4]) && create_if_block(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (!/*isFromRowHidden*/ ctx[3] && !/*isToRowHidden*/ ctx[4] || /*isFromRowHidden*/ ctx[3] !== /*isToRowHidden*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    const MIN_LEN = 12;
    const ARROW_SIZE = 5;

    function instance$1($$self, $$props, $$invalidate) {
    	let $rowStore;
    	let $taskStore;
    	component_subscribe($$self, rowStore, $$value => $$invalidate(11, $rowStore = $$value));
    	component_subscribe($$self, taskStore, $$value => $$invalidate(12, $taskStore = $$value));
    	let { id } = $$props;
    	let { fromId } = $$props;
    	let { toId } = $$props;
    	let { stroke = 'red' } = $$props;
    	let { strokeWidth = 2 } = $$props;
    	let arrowPath;
    	let path;
    	let fromTask;
    	let isFromRowHidden;
    	let toTask;
    	let isToRowHidden;

    	$$self.$$set = $$props => {
    		if ('id' in $$props) $$invalidate(0, id = $$props.id);
    		if ('fromId' in $$props) $$invalidate(7, fromId = $$props.fromId);
    		if ('toId' in $$props) $$invalidate(8, toId = $$props.toId);
    		if ('stroke' in $$props) $$invalidate(1, stroke = $$props.stroke);
    		if ('strokeWidth' in $$props) $$invalidate(2, strokeWidth = $$props.strokeWidth);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$taskStore, fromId, $rowStore, fromTask, toId, toTask, isFromRowHidden, path, isToRowHidden*/ 8152) {
    			{
    				$$invalidate(9, fromTask = $taskStore.entities[fromId]);
    				$$invalidate(3, isFromRowHidden = $rowStore.entities[fromTask.model.resourceId].hidden);
    				$$invalidate(10, toTask = $taskStore.entities[toId]);
    				$$invalidate(4, isToRowHidden = $rowStore.entities[toTask.model.resourceId].hidden);
    				let startY = fromTask.top + fromTask.height / 2;
    				let startX = fromTask.left + fromTask.width;
    				let endY = toTask.top + toTask.height / 2;
    				let endX = toTask.left;
    				let width = endX - startX;
    				let height = endY - startY;

    				if (isFromRowHidden) {
    					$$invalidate(6, path = `M${endX} ${endY}`);

    					if (startX + MIN_LEN >= endX && startY != endY) {
    						$$invalidate(6, path += `L ${endX + 1.5 - MIN_LEN} ${endY}`);
    					} else {
    						$$invalidate(6, path += `L ${endX + 1.5 - width / 2} ${endY}`);
    					}

    					$$invalidate(6, path += `m -2 -2 a 2 2 0 1 1 0 4 a 2 2 0 1 1 0 -4`);

    					$$invalidate(5, arrowPath = `M${toTask.left - ARROW_SIZE}  ${toTask.top + toTask.height / 2 - ARROW_SIZE} 
                        L${toTask.left} ${toTask.top + toTask.height / 2} 
                        L${toTask.left - ARROW_SIZE} ${toTask.top + toTask.height / 2 + ARROW_SIZE} Z`);
    				} else if (isToRowHidden) {
    					$$invalidate(6, path = `M${startX} ${startY}`);

    					if (startX + MIN_LEN >= endX && startY != endY) {
    						$$invalidate(6, path += `L ${startX + 1.5 + MIN_LEN} ${startY}`);
    					} else {
    						$$invalidate(6, path += `L ${startX + 1.5 + width / 2} ${startY}`);
    					}

    					$$invalidate(6, path += `m -2 -2 a 2 2 0 1 1 0 4 a 2 2 0 1 1 0 -4`);
    					$$invalidate(5, arrowPath = ``);
    				} else if (!isFromRowHidden && !isToRowHidden) {
    					$$invalidate(6, path = `M${startX} ${startY}`);

    					if (startX + MIN_LEN >= endX && startY != endY) {
    						$$invalidate(6, path += `L ${startX + MIN_LEN} ${startY} 
                            L ${startX + MIN_LEN} ${startY + height / 2}
                            L ${endX - MIN_LEN} ${startY + height / 2}
                            L ${endX - MIN_LEN} ${endY}
                            L ${endX - 2} ${endY}`);
    					} else {
    						$$invalidate(6, path += `L ${startX + width / 2} ${startY} 
                            L ${startX + width / 2} ${endY}
                            L ${endX - 2} ${endY}`);
    					}

    					$$invalidate(5, arrowPath = `M${toTask.left - ARROW_SIZE} ${toTask.top + toTask.height / 2 - ARROW_SIZE} 
                            L${toTask.left} ${toTask.top + toTask.height / 2} 
                            L${toTask.left - ARROW_SIZE} ${toTask.top + toTask.height / 2 + ARROW_SIZE} Z`);
    				}
    			}
    		}
    	};

    	return [
    		id,
    		stroke,
    		strokeWidth,
    		isFromRowHidden,
    		isToRowHidden,
    		arrowPath,
    		path,
    		fromId,
    		toId,
    		fromTask,
    		toTask,
    		$rowStore,
    		$taskStore
    	];
    }

    class Dependency extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			id: 0,
    			fromId: 7,
    			toId: 8,
    			stroke: 1,
    			strokeWidth: 2
    		});
    	}
    }

    var css_248z = ".dependency-container.svelte-50yf7x{position:absolute;width:100%;height:100%;pointer-events:none;top:0;float:left;overflow:hidden;z-index:0}";
    styleInject(css_248z);

    /* src/modules/dependencies/GanttDependencies.svelte generated by Svelte v3.55.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (26:4) {#each visibleDependencies as dependency (dependency.id)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let dependency;
    	let current;
    	const dependency_spread_levels = [/*dependency*/ ctx[6]];
    	let dependency_props = {};

    	for (let i = 0; i < dependency_spread_levels.length; i += 1) {
    		dependency_props = assign(dependency_props, dependency_spread_levels[i]);
    	}

    	dependency = new Dependency({ props: dependency_props });

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(dependency.$$.fragment);
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(dependency, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			const dependency_changes = (dirty & /*visibleDependencies*/ 1)
    			? get_spread_update(dependency_spread_levels, [get_spread_object(/*dependency*/ ctx[6])])
    			: {};

    			dependency.$set(dependency_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(dependency.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(dependency.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(dependency, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*visibleDependencies*/ ctx[0];
    	const get_key = ctx => /*dependency*/ ctx[6].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "dependency-container svelte-50yf7x");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*visibleDependencies*/ 1) {
    				each_value = /*visibleDependencies*/ ctx[0];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $visibleHeight;
    	let $taskStore;
    	component_subscribe($$self, taskStore, $$value => $$invalidate(5, $taskStore = $$value));
    	const { visibleHeight } = getContext('dimensions');
    	component_subscribe($$self, visibleHeight, value => $$invalidate(4, $visibleHeight = value));
    	let { paddingTop } = $$props;
    	let { dependencies = [] } = $$props;
    	let visibleDependencies = [];

    	$$self.$$set = $$props => {
    		if ('paddingTop' in $$props) $$invalidate(2, paddingTop = $$props.paddingTop);
    		if ('dependencies' in $$props) $$invalidate(3, dependencies = $$props.dependencies);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*dependencies, $taskStore, paddingTop, $visibleHeight*/ 60) {
    			{
    				const result = [];

    				for (let i = 0; i < dependencies.length; i++) {
    					const dependency = dependencies[i];
    					const map = $taskStore.entities;
    					const fromTask = map[dependency.fromId];
    					const toTask = map[dependency.toId];

    					if (fromTask && toTask && Math.min(fromTask.top, toTask.top) <= paddingTop + $visibleHeight && Math.max(fromTask.top, toTask.top) >= paddingTop) {
    						result.push(dependency);
    					}
    				}

    				$$invalidate(0, visibleDependencies = result);
    			}
    		}
    	};

    	return [
    		visibleDependencies,
    		visibleHeight,
    		paddingTop,
    		dependencies,
    		$visibleHeight,
    		$taskStore
    	];
    }

    class GanttDependencies extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { paddingTop: 2, dependencies: 3 });
    	}
    }

    var SvelteGanttDependencies = GanttDependencies;

    const defaults = {
        enabled: true,
        elementContent: () => {
            const element = document.createElement('div');
            element.innerHTML = 'New Task';
            Object.assign(element.style, {
                position: 'absolute',
                background: '#eee',
                padding: '0.5em 1em',
                fontSize: '12px',
                pointerEvents: 'none',
            });
            return element;
        }
    };
    class SvelteGanttExternal {
        constructor(node, options) {
            this.options = Object.assign({}, defaults, options);
            this.draggable = new Draggable(node, {
                onDrag: this.onDrag.bind(this),
                dragAllowed: () => this.options.enabled,
                resizeAllowed: false,
                onDrop: this.onDrop.bind(this),
                container: document.body,
                getX: (event) => event.pageX,
                getY: (event) => event.pageY,
                getWidth: () => 0
            });
        }
        onDrag({ x, y }) {
            if (!this.element) {
                this.element = this.options.elementContent();
                document.body.appendChild(this.element);
                this.options.dragging = true;
            }
            this.element.style.top = y + 'px';
            this.element.style.left = x + 'px';
        }
        onDrop(event) {
            var _a, _b, _c, _d;
            const gantt = this.options.gantt;
            const targetRow = gantt.dndManager.getTarget('row', event.mouseEvent);
            if (targetRow) {
                const mousePos = getRelativePos(gantt.getRowContainer(), event.mouseEvent);
                const date = gantt.utils.getDateByPosition(mousePos.x);
                (_b = (_a = this.options).onsuccess) === null || _b === void 0 ? void 0 : _b.call(_a, targetRow, date, gantt);
            }
            else {
                (_d = (_c = this.options).onfail) === null || _d === void 0 ? void 0 : _d.call(_c);
            }
            document.body.removeChild(this.element);
            this.options.dragging = false;
            this.element = null;
        }
    }

    // import { SvelteGanttTableComponent } from './modules/table';
    var SvelteGantt = Gantt;

    exports.MomentSvelteGanttDateAdapter = MomentSvelteGanttDateAdapter;
    exports.SvelteGantt = SvelteGantt;
    exports.SvelteGanttDependencies = SvelteGanttDependencies;
    exports.SvelteGanttExternal = SvelteGanttExternal;
    exports.SvelteGanttTable = SvelteGanttTable;

    Object.defineProperty(exports, '__esModule', { value: true });

})(this.window = this.window || {});
//# sourceMappingURL=index.iife.js.map
