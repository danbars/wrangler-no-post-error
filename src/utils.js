export async function writeKV (key, value, ttl, kvAcccountId, namespace, apiToken) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${kvAcccountId}/storage/kv/namespaces/${namespace}/values/${key}`;
    const ttlQueryString = ttl ? `?expiration_ttl=${ttl}` : '';
    const headers = {
        'Authorization': 'Bearer ' + apiToken,
        'Content-Type': 'application/json'
    };
    console.log('in writeKV', url, headers, value)

    // eslint-disable-next-line no-undef
    return fetch(url + ttlQueryString, {
        method: 'PUT',
        headers,
        body: value,
    })
}

export async function getKV (key, kvAccountId, namespace, apiToken, asJson) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${kvAccountId}/storage/kv/namespaces/${namespace}/values/${key}`;
    const headers = {
        'Authorization': 'Bearer ' + apiToken
    };

    // eslint-disable-next-line no-undef
    const response = await fetch(url, {
        headers
    });
    if (!asJson) {
        return response;
    }
    const json = await response.json();
    return json;
}