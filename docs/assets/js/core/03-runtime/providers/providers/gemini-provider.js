/* =============================================================================
   GEMINI PROVIDER
============================================================================= */

import {
  getRuntimeProviderState
} from '../runtime-provider-state.js';

import {
  buildRuntimeSystemIdentity
} from '../../system-prompt/runtime-system-identity.js';

export async function requestGeminiCompletion(payload = {}) {
  const runtime = getRuntimeProviderState();
  const response = await fetch(
    '/functions/v1/runtime-gemini-completion',
    {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Neuroartan-Runtime-Model': String(runtime.activeModel || '')
      },
      body:JSON.stringify({
        generationConfig:{
          temperature:0.82,
          topP:0.92,
          topK:40,
          maxOutputTokens:2048
        },

        systemInstruction:{
          parts:[
            {
              text:buildRuntimeSystemIdentity()
            }
          ]
        },

        contents:[
          {
            role:'user',

            parts:[
              {
                text:String(payload.prompt || '')
              }
            ]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const failure = await response.text();

    throw new Error(
      'Gemini runtime proxy error: ' + failure
    );
  }

  const data = await response.json();

  console.log(
    '[ICOS:GEMINI:RAW]',
    data
  );

  const responseText =
    data?.candidates?.[0]?.content?.parts?.map(
      (part) => part?.text || ''
    ).join('\n') ||

    data?.candidates?.[0]?.output ||
    '';

  console.log(
    '[ICOS:GEMINI:TEXT]',
    responseText
  );

  return String(
    responseText || ''
  ).trim();
}


export async function streamGeminiCompletion(payload = {}) {
  return requestGeminiCompletion(payload);
}
