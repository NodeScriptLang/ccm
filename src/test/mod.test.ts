import assert from 'assert';

import { applyMod } from '../main/index.js';

describe('modify', () => {

    describe('object', () => {

        it('sets top-level non-existent property', () => {
            const data: any = {};
            applyMod(data, ['test'], { hello: 'world' });
            assert.deepStrictEqual(data, {
                test: {
                    hello: 'world'
                }
            });
        });

        it('overwrites existing top-level property', () => {
            const data: any = { metadata: 123 };
            applyMod(data, ['metadata'], { hello: 'world' });
            assert.deepStrictEqual(data, {
                metadata: { hello: 'world' }
            });
        });

        it('sets child property of existing object', () => {
            const data: any = { metadata: {} };
            applyMod(data, ['metadata', 'foo'], { hello: 'world' });
            assert.deepStrictEqual(data, {
                metadata: {
                    foo: { hello: 'world' }
                }
            });
        });

        it('initializes non-existend nested property with {}', () => {
            const data: any = { metadata: {} };
            applyMod(data, ['metadata', 'foo{}', 'hello'], 'world');
            assert.deepStrictEqual(data, {
                metadata: {
                    foo: { hello: 'world' }
                }
            });
        });

        it('throws if nested property does not exist and no initializer specified', () => {
            const data: any = { metadata: {} };
            try {
                applyMod(data, ['metadata', 'foo', 'hello'], 'world');
                throw new Error('UnexpectedSuccess');
            } catch (error: any) {
                assert.strictEqual(error.name, 'ModTargetNotFoundError');
            }
        });

        it('creates new record', () => {
            const data = {
                nodes: {
                    n1: { ref: 'String' },
                },
            };
            applyMod(data, ['nodes{}', 'n2'], { ref: 'Object' });
            assert.deepStrictEqual(data, {
                nodes: {
                    n1: { ref: 'String' },
                    n2: { ref: 'Object' },
                }
            });
        });

        it('deletes a record', () => {
            const data = {
                nodes: {
                    n1: { ref: 'String' },
                },
            };
            applyMod(data, ['nodes{}', 'n1'], undefined);
            assert.deepStrictEqual(data, {
                nodes: {}
            });
        });

    });

    describe('array', () => {

        it('pushes to top-level array', () => {
            const data: any = [];
            applyMod(data, ['@'], 'foo');
            assert.deepStrictEqual(data, ['foo']);
        });

        it('pushes to nested array', () => {
            const data: any = {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'b', value: 'bar' },
                ],
            };
            applyMod(data, ['items', '@'], { id: 'c', value: 'baz' });
            assert.deepStrictEqual(data, {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'b', value: 'bar' },
                    { id: 'c', value: 'baz' },
                ]
            });
        });

        it('throws if push undefined', () => {
            const data: any = { items: [] };
            try {
                applyMod(data, ['items', '@'], undefined);
                throw new Error('UnexpectedSuccess');
            } catch (error: any) {
                assert.strictEqual(error.name, 'InvalidModError');
            }
        });

        it('insert value before item', () => {
            const data: any = {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'b', value: 'bar' },
                ],
            };
            applyMod(data, ['items', 'id=b'], { id: 'c', value: 'baz' });
            assert.deepStrictEqual(data, {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'c', value: 'baz' },
                    { id: 'b', value: 'bar' },
                ],
            });
        });

        it('removes item by predicate', () => {
            const data: any = {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'b', value: 'bar' },
                ],
            };
            applyMod(data, ['items', 'id=b'], undefined);
            assert.deepStrictEqual(data, {
                items: [
                    { id: 'a', value: 'foo' },
                ],
            });
        });

        it('modifies property of an item', () => {
            const data: any = {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'b', value: 'bar' },
                ],
            };
            applyMod(data, ['items', 'id=b', 'value'], 'qux');
            assert.deepStrictEqual(data, {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'b', value: 'qux' },
                ],
            });
        });

        it('initializes item if not found', () => {
            const data: any = {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'b', value: 'bar' },
                ],
            };
            applyMod(data, ['items', 'id=c{}', 'value'], 'qux');
            assert.deepStrictEqual(data, {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'b', value: 'bar' },
                    { id: 'c', value: 'qux' },
                ],
            });
        });

        it('throws if item not found', () => {
            const data: any = {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'b', value: 'bar' },
                ],
            };
            try {
                applyMod(data, ['items', 'id=c', 'value'], 'qux');
                throw new Error('UnexpectedSuccess');
            } catch (error: any) {
                assert.strictEqual(error.name, 'ModTargetNotFoundError');
            }
        });

        it('replaces top-level document with {} query', () => {
            const data: any = {
                foo: 123,
                bar: 234,
            };
            applyMod(data, ['{}'], { hello: 'world' });
            assert.deepStrictEqual(data, { hello: 'world' });
        });

    });

    describe('integration', () => {

        it('creates a document from scratch', () => {
            const doc: any = {};
            applyMod(doc, ['metadata{}', 'label'], 'Some graph');
            applyMod(doc, ['nodes{}', 'n1'], { ref: 'String' });
            applyMod(doc, ['nodes{}', 'n2'], { ref: 'Object' });
            applyMod(doc, ['nodes{}', 'n1', 'props{}', 'value{}', 'value'], 'Hello');
            applyMod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', '@'], { id: 'e1' });
            applyMod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', '@'], { id: 'e2' });
            applyMod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', 'id=e1', 'key'], 'foo');
            applyMod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', 'id=e1', 'value'], 'hello');
            applyMod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', 'id=e2', 'key'], 'bar');
            applyMod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', 'id=e2', 'linkId'], 'n1');
            assert.deepStrictEqual(doc, {
                metadata: {
                    label: 'Some graph'
                },
                nodes: {
                    n1: {
                        ref: 'String',
                        props: {
                            value: {
                                value: 'Hello'
                            }
                        }
                    },
                    n2: {
                        ref: 'Object',
                        props: {
                            properties: {
                                entries: [
                                    {
                                        id: 'e1',
                                        key: 'foo',
                                        value: 'hello'
                                    },
                                    {
                                        id: 'e2',
                                        key: 'bar',
                                        linkId: 'n1'
                                    }
                                ]
                            }
                        }
                    }
                }
            });
        });

    });

});
