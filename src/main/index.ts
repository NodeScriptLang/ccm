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

export function modify(data: any, mod: Modification) {
    const { query, value } = mod;
    applyMod(data, query.trim().split(/ +/g), value);
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
        if (value === undefined) {
            // Delete
            delete obj[token.key];
        } else {
            // Set
            obj[token.key] = value;
        }
        return;
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
    const targetIndex = arr.findIndex(_ => _[token.key] === token.predicate);
    if (targetIndex === -1) {
        throw new ModTargetNotFoundError(`Target ${curr} does not exist`);
    }
    if (rest.length === 0) {
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
    const m = /^([@a-zA-Z0-9]+)((=([a-zA-Z0-9]+))|(\{\}|\[\]))?$/.exec(q);
    if (!m) {
        throw new InvalidModError(`Invalid query: ${q}`);
    }
    const key = m[1];
    const predicate = m[4] || undefined;
    const init = m[5] === '{}' ? 'object' : m[5] === '[]' ? 'array' : undefined;
    return { key, predicate, init };
}
