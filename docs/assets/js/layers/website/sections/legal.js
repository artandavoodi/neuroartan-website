import {bindDocumentReaders} from '../../../core/02-systems/document-reader.js';
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>bindDocumentReaders(),{once:true});
else bindDocumentReaders();
