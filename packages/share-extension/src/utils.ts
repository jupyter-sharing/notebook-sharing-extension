import { PathExt } from '@jupyterlab/coreutils';

// 50 characters for each name and email should be good enough
export const REGEX = /^([a-zA-Z][^<>]{1,50})<([^<>]{1,50})>/i;

export function generateFileName(
  fileName: string,
  existingNames: string[]
): string {
  let index = 0;
  let tempName = '';
  const baseName = PathExt.basename(fileName, PathExt.extname(fileName));

  do {
    tempName = `${baseName}${index++ || ''}${PathExt.extname(fileName)}`;
  } while (existingNames.includes(tempName));

  return tempName;
}

export const tryParse = <T>(input: string): T => {
  let data = {};

  try {
    data = JSON.parse(input);
  } catch (e) {
    console.log(input);
  }

  return data as T;
};

export function jsTemplate(nonce: number): string {
  return `
    window.addEventListener('load', () => {
      document.addEventListener('click', e => {
        if (e.metaKey || e.ctrlKey) {
          return;
        }

        const node = e.target.closest('a');

        if (node && node.tagName === 'A') {
          e.stopPropagation();
          e.preventDefault();
          openPopup();
        }
      }, true);
    });

    function openPopup() {
      const el = document.getElementById('popup-wrapper-${nonce}');

      el.style.display = 'block';
    }

    function closePopup() {
      const el = document.getElementById('popup-wrapper-${nonce}');

      el.style.display = 'none';
    }
  `;
}

export function getCSSTemplate(nonce: number): string {
  return `
    #popup-wrapper-${nonce} {
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: none;
      z-index: 10000;
      position: fixed;
    }

    #popup-${nonce} {
      top:0;
      width: 350px;
      display: flex;
      border-radius: 5px;
      flex-direction: column;
      background-color: #fff;
      border: 1px solid #ddd;
      padding: 24px 24px 12px 24px;
      box-shadow: 0 2px 8px #2a2a2a;
    }

    #popup-wrapper-${nonce} > .wrapper-${nonce} {
      display: flex;
      height: 100%;
      align-items: center;
      justify-content: center;
      background: rgb(0 0 0 / 10%)
    }

    #popup-${nonce} > .close-btn {
      border: 0;
      color: white;
      height: 32px;
      outline: none;
      cursor: pointer;
      line-height: 32px;
      padding: 0px 12px;
      text-align: center;
      background: #1976d2;
      align-self: flex-end;
      letter-spacing: 0.8px;
      box-sizing: border-box;
    }

    .popup-body-${nonce} {
      padding: 10px;
    }

    #popup-${nonce} span.key {
      color: #000;
      font-size: 0.85em;
      border-radius: 0.2em;
      padding: 0.1em 0.3em;
      border: 1px solid #aaa;
      background-color: #f9f9f9;
      background-image: linear-gradient(to bottom,#eee,#f9f9f9,#eee);
    }
  `;
}

export function getPopupTemplate(nonce: number): string {
  return `
   <div id="popup-wrapper-${nonce}">
     <div class="wrapper-${nonce}">
        <div id="popup-${nonce}">
          <div class="popup-body-${nonce}">Please use <span class="key">Cmd</span> + <span class="key">click</span> to open hyperlink in new tab</div>
          <button class="close-btn" onClick="closePopup()">OK</button
        </div>
     </div>
   </div>
  `;
}
