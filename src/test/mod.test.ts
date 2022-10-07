import assert from 'assert';

import { mod } from '../main/index.js';

describe('mod', () => {

    describe('object', () => {

        it('sets top-level non-existent property', () => {
            const data: any = {};
            mod(data, ['test'], { hello: 'world' });
            assert.deepStrictEqual(data, {
                test: {
                    hello: 'world'
                }
            });
        });

        it('overwrites existing top-level property', () => {
            const data: any = { metadata: 123 };
            mod(data, ['metadata'], { hello: 'world' });
            assert.deepStrictEqual(data, {
                metadata: { hello: 'world' }
            });
        });

        it('sets child property of existing object', () => {
            const data: any = { metadata: {} };
            mod(data, ['metadata', 'foo'], { hello: 'world' });
            assert.deepStrictEqual(data, {
                metadata: {
                    foo: { hello: 'world' }
                }
            });
        });

        it('initializes non-existend nested property with {}', () => {
            const data: any = { metadata: {} };
            mod(data, ['metadata', 'foo{}', 'hello'], 'world');
            assert.deepStrictEqual(data, {
                metadata: {
                    foo: { hello: 'world' }
                }
            });
        });

        it('throws if nested property does not exist and no initializer specified', () => {
            const data: any = { metadata: {} };
            try {
                mod(data, ['metadata', 'foo', 'hello'], 'world');
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
            mod(data, ['nodes{}', 'n2'], { ref: 'Object' });
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
            mod(data, ['nodes{}', 'n1'], undefined);
            assert.deepStrictEqual(data, {
                nodes: {}
            });
        });

    });

    describe('array', () => {

        it('pushes to top-level array', () => {
            const data: any = [];
            mod(data, ['@'], 'foo');
            assert.deepStrictEqual(data, ['foo']);
        });

        it('pushes to nested array', () => {
            const data: any = {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'b', value: 'bar' },
                ],
            };
            mod(data, ['items', '@'], { id: 'c', value: 'baz' });
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
                mod(data, ['items', '@'], undefined);
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
            mod(data, ['items', 'id=b'], { id: 'c', value: 'baz' });
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
            mod(data, ['items', 'id=b'], undefined);
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
            mod(data, ['items', 'id=b', 'value'], 'qux');
            assert.deepStrictEqual(data, {
                items: [
                    { id: 'a', value: 'foo' },
                    { id: 'b', value: 'qux' },
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
                mod(data, ['items', 'id=c', 'value'], 'qux');
                throw new Error('UnexpectedSuccess');
            } catch (error: any) {
                assert.strictEqual(error.name, 'ModTargetNotFoundError');
            }
        });

    });

    describe('integration', () => {

        it('creates a document from scratch', () => {
            const doc: any = {};
            mod(doc, ['metadata{}', 'label'], 'Some graph');
            mod(doc, ['nodes{}', 'n1'], { ref: 'String' });
            mod(doc, ['nodes{}', 'n2'], { ref: 'Object' });
            mod(doc, ['nodes{}', 'n1', 'props{}', 'value{}', 'value'], 'Hello');
            mod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', '@'], { id: 'e1' });
            mod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', '@'], { id: 'e2' });
            mod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', 'id=e1', 'key'], 'foo');
            mod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', 'id=e1', 'value'], 'hello');
            mod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', 'id=e2', 'key'], 'bar');
            mod(doc, ['nodes{}', 'n2', 'props{}', 'properties{}', 'entries[]', 'id=e2', 'linkId'], 'n1');
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
