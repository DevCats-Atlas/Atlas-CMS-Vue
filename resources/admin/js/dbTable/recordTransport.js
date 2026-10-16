import axios from 'axios';
import { objectToFormData } from '@inertiajs/core';
import { submitValues } from './formModel.js';

// Main Inertia forms and JSON modal forms share fields and Laravel method spoofing.
export function recordFormPayload(fields, models, extra = {}, method = 'post') {
    return { ...extra, ...submitValues(fields, models), ...(method === 'put' ? { _method: 'put' } : {}) };
}

export function postRecordForm(url, fields, models, extra = {}, method = 'post') {
    return axios.post(url, objectToFormData(recordFormPayload(fields, models, extra, method)));
}
