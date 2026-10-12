'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const source=fs.readFileSync('content-scripts/pearson.js','utf8');
assert.match(source,/For plain text, numeric and equation fields use one non-empty string or number, never an object or array\./,'Pearson asks for a scalar value in ordinary answer fields');
assert.match(source,/If the visible question and linked sources do not contain information needed for a field, do not guess: set only that field to an empty string/,'Pearson tells the AI not to invent answers when referenced source data is missing');
assert.match(source,/const unavailable=pending\.fields\.filter\(f=>data\.answer\[f\.key\]===null\|\|\(typeof data\.answer\[f\.key\]==='string'&&!data\.answer\[f\.key\]\.trim\(\)\)\)/,'blank or null AI fields are classified as unavailable instead of invalid');
assert.match(source,/AI could not determine '\+labels\.join\(', '\)\+' from the visible question\. Open the referenced source material and ask again\. No answers were entered\./,'the Pearson status explains missing source data and confirms no answer was entered');
assert.match(source,/value:unavailable\.includes\(f\)\?'Needs source data'/,'the readable preview labels unavailable fields');
assert.match(source,/answerPreview\(displayFields,settings\.showExplanation\?explanation:'',message\.grounded\|\|'',data\.answer\)/,'the structured preview retains the raw response for diagnosis');
assert.match(source,/answer:Object\.fromEntries\(fields\.map\(f=>\[f\.key,f\.value\]\)\)/,'the readable preview displays the missing-data marker rather than a blank cell');
assert.match(source,/AI returned an unsupported value for '\+StudyConfig\.answerLabel\(f,index\)/,'other invalid types identify the exact Pearson field needing review');
assert.doesNotMatch(source,/An AI field value is invalid\./,'the generic field validation error is removed');
console.log('PASS Pearson missing-data and invalid-value diagnostics');
