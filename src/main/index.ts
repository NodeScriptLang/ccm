export interface Modification {
    query: string;
    value: any;
}

type QueryToken = {
    key: string;
    predicate: string | undefined;
    init: 'object' | 'array' | undefined;
};

export class InvalidModError extends Error {
    override name = this.constructor.name;
    status = 500;
}

export class ModTargetNotFoundError extends Error {
    override name = this.constructor.name;
    status = 500;
}

export function modify(data: any, mod: Modification, ignoreMissing = true) {
    const { query, value } = mod;
    try {
        applyMod(data, query.trim().split(/ +/g), value);
    } catch (error) {
        if (ignoreMissing && error instanceof ModTargetNotFoundError) {
            return;
        }
        throw error;
    }
}

export function applyMod(data: any, query: string[], value: any): void {
    if (!query.length) {
        throw new InvalidModError('Query must be a non-empty array');
    }
    if (Array.isArray(data)) {
        return modArray(data, query, value);
    }
    if (data && typeof data === 'object') {
        return modObject(data, query, value);
    }
    throw new InvalidModError('Data must be either an object or array');
}

function modObject(obj: Record<string, any>, query: string[], value: any): void {
    const [curr, ...rest] = query;
    const token = parseQueryToken(curr);
    if (token.predicate != null) {
        throw new InvalidModError(`Cannot apply ${curr} to object`);
    }
    if (rest.length === 0) {
        return applyObjectValue(obj, token.key, value);
    }
    // Init target and continue
    if (obj[token.key] == null) {
        // Init {} or [] or throw
        if (token.init === 'object') {
            obj[token.key] = {};
        } else if (token.init === 'array') {
            obj[token.key] = [];
        } else {
            throw new ModTargetNotFoundError(`Target ${curr} does not exist`);
        }
    }
    return applyMod(obj[token.key], rest, value);
}

function applyObjectValue(obj: Record<string, any>, key: string, value: any) {
    if (key === '') {
        // Replace the top-level object with `value`; the value must be an object in this case
        const isObject = value && typeof value === 'object';
        if (!isObject) {
            throw new InvalidModError(`Cannot replace an object with non-object value`);
        }
        for (const key of Object.keys(obj)) {
            delete obj[key];
        }
        Object.assign(obj, value);
    } else if (value === undefined) {
        // Delete
        delete obj[key];
    } else {
        // Set
        obj[key] = value;
    }
}

function modArray(arr: any[], query: string[], value: any): void {
    const [curr, ...rest] = query;
    const token = parseQueryToken(curr);
    if (rest.length === 0 && token.key === '@') {
        // Push
        if (value === undefined) {
            throw new InvalidModError('Cannot push undefined');
        }
        arr.push(value);
        return;
    }
    // Find target index by predicate
    if (token.predicate == null) {
        throw new InvalidModError(`Cannot apply ${curr} to array`);
    }
    let targetIndex = arr.findIndex(_ => _[token.key] === token.predicate);
    if (targetIndex === -1) {
        if (token.init === 'object') {
            arr.push({
                [token.key]: token.predicate,
            });
            targetIndex = arr.length - 1;
        } else {
            throw new ModTargetNotFoundError(`Target ${curr} does not exist`);
        }
    } if (rest.length === 0) {
        if (value === undefined) {
            // Remove At
            arr.splice(targetIndex, 1);
        } else {
            // Insert Before
            arr.splice(targetIndex, 0, value);
        }
        return;
    }
    return applyMod(arr[targetIndex], rest, value);
}

function parseQueryToken(q: string): QueryToken {
    const m = /^([@a-zA-Z0-9$_-]*)(=([a-zA-Z0-9_$-]+))?(\{\}|\[\])?$/.exec(q);
    if (!m) {
        throw new InvalidModError(`Invalid query: ${q}`);
    }
    const key = m[1];
    const predicate = m[3] || undefined;
    const init = m[4] === '{}' ? 'object' : m[4] === '[]' ? 'array' : undefined;
    return { key, predicate, init };
}
