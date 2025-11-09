/**
 * /templates/editor エンドポイント用のHTMLテンプレート
 * ビジュアルテンプレートエディタ
 */
export function getTemplatesEditorHtml(): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ビジュアルエディタ - 新規テンプレート</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; height: 100vh; overflow: hidden; }

    .editor-container { display: flex; height: 100vh; }
    .canvas-area { flex: 1; background: #f5f5f5; position: relative; overflow: auto; }
    .properties-panel { width: 350px; background: white; border-left: 1px solid #ddd; overflow-y: auto; padding: 20px; }

    .toolbar { background: white; border-bottom: 1px solid #ddd; padding: 15px 20px; display: flex; gap: 10px; align-items: center; }
    .toolbar h1 { font-size: 18px; flex: 1; }
    .toolbar button { background: #007bff; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .toolbar button:hover { background: #0056b3; }
    .toolbar button.secondary { background: #6c757d; }
    .toolbar button.secondary:hover { background: #5a6268; }

    .canvas { position: relative; margin: 40px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: default; }
    .text-element { position: absolute; cursor: move; border: 2px solid transparent; padding: 4px; user-select: none; font-family: 'Noto Sans JP', sans-serif; white-space: pre-wrap; word-break: break-word; line-height: 1.2; }
    .text-element:hover { border-color: #007bff; background: rgba(0,123,255,0.05); }
    .text-element.selected { border-color: #007bff; background: rgba(0,123,255,0.1); }
    .text-element .resize-handle { position: absolute; right: -6px; bottom: -6px; width: 12px; height: 12px; background: #007bff; border: 2px solid white; border-radius: 50%; cursor: nwse-resize; display: none; }
    .text-element.selected .resize-handle { display: block; }

    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #555; font-size: 13px; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .form-group input[type="number"] { width: 100%; }
    .form-group input[type="color"] { height: 40px; cursor: pointer; }
    .form-group .input-row { display: flex; gap: 10px; }
    .form-group .input-row > * { flex: 1; }

    .section-title { font-size: 16px; font-weight: 700; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #007bff; color: #333; }
    .section-title:first-child { margin-top: 0; }

    .no-selection { color: #999; font-style: italic; padding: 40px 20px; text-align: center; }

    .bg-preview { width: 100%; height: 100px; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px; background-size: cover; background-position: center; }

    .upload-area {
      width: 100%;
      min-height: 150px;
      border: 2px dashed #007bff;
      border-radius: 8px;
      margin-top: 10px;
      padding: 30px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #f8f9fa;
    }
    .upload-area:hover { background: #e9ecef; border-color: #0056b3; }
    .upload-area.dragover { background: #cfe2ff; border-color: #0056b3; border-style: solid; }
    .upload-area .icon { font-size: 48px; margin-bottom: 10px; color: #007bff; }
    .upload-area .text { font-size: 14px; color: #666; margin-bottom: 5px; }
    .upload-area .subtext { font-size: 12px; color: #999; }
    .upload-area .preview-image { width: 100%; max-height: 200px; object-fit: contain; margin-top: 10px; border-radius: 4px; }
    .upload-area.uploading { opacity: 0.6; pointer-events: none; }

    button.danger { background: #dc3545; }
    button.danger:hover { background: #c82333; }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1 id="pageTitle">ビジュアルエディタ - 新規テンプレート</h1>
    <button onclick="addTextElement()" class="secondary">テキスト要素を追加</button>
    <button onclick="previewTemplate()" class="secondary">プレビュー</button>
    <button onclick="saveTemplate()">保存</button>
    <button onclick="window.location.href='/templates/ui'" class="secondary">戻る</button>
  </div>

  <div class="editor-container">
    <div class="canvas-area">
      <div id="canvas" class="canvas"></div>
    </div>

    <div class="properties-panel" id="propertiesPanel">
      <div class="no-selection">
        左側のキャンバスで要素を選択するか、<br>「テキスト要素を追加」ボタンをクリックしてください
      </div>
    </div>
  </div>

  <script>
    const API_KEY = sessionStorage.getItem('ogp_api_key') || prompt('APIキーを入力してください');
    if (API_KEY) sessionStorage.setItem('ogp_api_key', API_KEY);

    // State
    let templateState = {
      id: null,
      name: '',
      width: 1200,
      height: 630,
      background: { type: 'color', value: '#1e40ff' },
      elements: []
    };

    let selectedElementId = null;
    let dragState = null;

    // Initialize
    initializeEditor();

    function initializeEditor() {
      // Check if editing existing template
      const urlParams = new URLSearchParams(window.location.search);
      const templateId = urlParams.get('id');

      if (templateId) {
        loadTemplate(templateId);
      } else {
        renderCanvas();
        showTemplateProperties();
      }
    }

    async function loadTemplate(id) {
      try {
        const response = await fetch(\`/templates/\${id}\`, {
          headers: { 'x-api-key': API_KEY }
        });

        if (!response.ok) throw new Error('テンプレートの読み込みに失敗しました');

        const template = await response.json();
        templateState = template;

        document.getElementById('pageTitle').textContent = \`ビジュアルエディタ - \${template.name}\`;
        renderCanvas();
        showTemplateProperties();
      } catch (error) {
        alert(error.message);
        window.location.href = '/templates/ui';
      }
    }

    function renderCanvas() {
      const canvas = document.getElementById('canvas');
      const { width, height, background, elements } = templateState;

      // Set canvas size and background
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      if (background.type === 'color') {
        canvas.style.background = background.value;
        canvas.style.backgroundImage = 'none';
      } else if (background.type === 'image' || background.type === 'upload') {
        canvas.style.backgroundImage = \`url(\${background.value})\`;
        canvas.style.backgroundSize = 'cover';
        canvas.style.backgroundPosition = 'center';
      } else {
        canvas.style.background = '#ffffff';
        canvas.style.backgroundImage = 'none';
      }

      // Clear and render elements
      canvas.innerHTML = '';

      elements.forEach(element => {
        const div = document.createElement('div');
        div.className = 'text-element';
        if (element.id === selectedElementId) div.classList.add('selected');
        div.dataset.id = element.id;
        div.textContent = \`[\${element.variable}]\`;

        div.style.left = element.x + 'px';
        div.style.top = element.y + 'px';
        div.style.fontSize = element.fontSize + 'px';
        div.style.fontFamily = element.fontFamily;
        div.style.color = element.color;
        div.style.fontWeight = element.fontWeight;
        div.style.textAlign = element.textAlign;

        if (element.maxWidth) {
          div.style.width = element.maxWidth + 'px';
        }

        if (element.maxHeight) {
          div.style.height = element.maxHeight + 'px';
        }

        // Add resize handle
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        div.appendChild(handle);

        // Click to select
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          selectElement(element.id);
        });

        // Drag to move
        div.addEventListener('pointerdown', (e) => {
          if (e.target.classList.contains('resize-handle')) {
            startResize(e, element.id);
          } else {
            startDrag(e, element.id);
          }
        });

        canvas.appendChild(div);
      });
    }

    function selectElement(id) {
      selectedElementId = id;
      renderCanvas();
      showElementProperties();
    }

    function deselectElement() {
      selectedElementId = null;
      renderCanvas();
      showTemplateProperties();
    }

    // Click canvas to deselect
    document.getElementById('canvas').addEventListener('click', (e) => {
      if (e.target.id === 'canvas') {
        deselectElement();
      }
    });

    function startDrag(e, elementId) {
      e.preventDefault();
      selectElement(elementId);

      const element = templateState.elements.find(el => el.id === elementId);
      const canvasRect = document.getElementById('canvas').getBoundingClientRect();

      dragState = {
        type: 'move',
        elementId,
        startX: e.clientX,
        startY: e.clientY,
        initialX: element.x,
        initialY: element.y
      };

      document.addEventListener('pointermove', onDragMove);
      document.addEventListener('pointerup', onDragEnd);
    }

    function startResize(e, elementId) {
      e.preventDefault();
      e.stopPropagation();
      selectElement(elementId);

      const element = templateState.elements.find(el => el.id === elementId);

      dragState = {
        type: 'resize',
        elementId,
        startX: e.clientX,
        startY: e.clientY,
        initialWidth: element.maxWidth || 200,
        initialHeight: element.maxHeight || 100
      };

      document.addEventListener('pointermove', onDragMove);
      document.addEventListener('pointerup', onDragEnd);
    }

    function onDragMove(e) {
      if (!dragState) return;

      const element = templateState.elements.find(el => el.id === dragState.elementId);

      if (dragState.type === 'move') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;

        element.x = Math.max(0, Math.min(templateState.width - 50, dragState.initialX + dx));
        element.y = Math.max(0, Math.min(templateState.height - 20, dragState.initialY + dy));
      } else if (dragState.type === 'resize') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        element.maxWidth = Math.max(50, dragState.initialWidth + dx);
        element.maxHeight = Math.max(20, dragState.initialHeight + dy);
      }

      renderCanvas();
      if (selectedElementId) showElementProperties();
    }

    function onDragEnd(e) {
      dragState = null;
      document.removeEventListener('pointermove', onDragMove);
      document.removeEventListener('pointerup', onDragEnd);
    }

    function addTextElement() {
      const newElement = {
        id: 'el_' + Date.now(),
        variable: 'text' + (templateState.elements.length + 1),
        x: 100,
        y: 100 + (templateState.elements.length * 50),
        fontSize: 32,
        fontFamily: 'Noto Sans JP',
        color: '#ffffff',
        fontWeight: 400,
        textAlign: 'left',
        maxWidth: 800,
        maxHeight: 200,
        minFontSize: 16
      };

      templateState.elements.push(newElement);
      selectElement(newElement.id);
    }

    function deleteSelectedElement() {
      if (!selectedElementId) return;
      if (!confirm('この要素を削除しますか？')) return;

      templateState.elements = templateState.elements.filter(el => el.id !== selectedElementId);
      deselectElement();
    }

    function showTemplateProperties() {
      const panel = document.getElementById('propertiesPanel');
      const { name, width, height, background } = templateState;

      panel.innerHTML = \`
        <div class="section-title">テンプレート設定</div>

        <div class="form-group">
          <label>テンプレート名</label>
          <input type="text" id="templateName" value="\${name}" placeholder="例: Tutorial Template" onchange="updateTemplateProperty('name', this.value)">
        </div>

        <div class="form-group">
          <label>サイズ（幅 x 高さ）</label>
          <div class="input-row">
            <input type="number" id="templateWidth" value="\${width}" min="200" max="4096" onchange="updateCanvasSize()">
            <input type="number" id="templateHeight" value="\${height}" min="200" max="4096" onchange="updateCanvasSize()">
          </div>
        </div>

        <div class="form-group">
          <label>背景タイプ</label>
          <select id="bgType" onchange="updateBackgroundType(this.value)">
            <option value="color" \${background.type === 'color' ? 'selected' : ''}>カラー</option>
            <option value="image" \${background.type === 'image' ? 'selected' : ''}>画像URL</option>
            <option value="upload" \${background.type === 'upload' ? 'selected' : ''}>画像アップロード</option>
          </select>
        </div>

        <div class="form-group" id="bgValueGroup">
          \${background.type === 'color' ?
            \`<label>背景色</label><input type="color" value="\${background.value}" onchange="updateTemplateProperty('background', {type: 'color', value: this.value})">\` :
            background.type === 'image' ?
            \`<label>画像URL</label><input type="text" value="\${background.value}" placeholder="https://example.com/image.jpg" onchange="updateTemplateProperty('background', {type: 'image', value: this.value})">
             \${background.value ? \`<div class="bg-preview" style="background-image: url('\${background.value}')"></div>\` : ''}\` :
            \`<label>画像をアップロード</label>
             <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
               \${background.value ?
                 \`<img src="\${background.value}" class="preview-image" alt="プレビュー" />
                  <div class="text">クリックまたはドラッグ&ドロップで画像を変更</div>\` :
                 \`<div class="icon">📤</div>
                  <div class="text">クリックまたはドラッグ&ドロップで画像をアップロード</div>
                  <div class="subtext">PNG, JPEG, GIF, WebP, SVG (最大10MB)</div>\`
               }
             </div>
             <input type="file" id="fileInput" accept="image/*" style="display: none;" onchange="handleBackgroundUpload(event)" />\`
          }
        </div>
      \`;

      // ドラッグ&ドロップイベントハンドラーを設定
      setupUploadAreaHandlers();
    }

    function showElementProperties() {
      const element = templateState.elements.find(el => el.id === selectedElementId);
      if (!element) return;

      const panel = document.getElementById('propertiesPanel');

      panel.innerHTML = \`
        <div class="section-title">テキスト要素</div>

        <div class="form-group">
          <label>変数名</label>
          <input type="text" value="\${element.variable}" onchange="updateElementProperty('variable', this.value)">
        </div>

        <div class="form-group">
          <label>位置（X, Y）</label>
          <div class="input-row">
            <input type="number" value="\${element.x}" min="0" max="\${templateState.width}" onchange="updateElementProperty('x', parseInt(this.value))">
            <input type="number" value="\${element.y}" min="0" max="\${templateState.height}" onchange="updateElementProperty('y', parseInt(this.value))">
          </div>
        </div>

        <div class="form-group">
          <label>フォントサイズ</label>
          <input type="number" value="\${element.fontSize}" min="8" max="200" onchange="updateElementProperty('fontSize', parseInt(this.value))">
        </div>

        <div class="form-group">
          <label>最小フォントサイズ（自動調整時）</label>
          <input type="number" value="\${element.minFontSize || Math.floor(element.fontSize / 2)}" min="8" max="200" onchange="updateElementProperty('minFontSize', parseInt(this.value))">
        </div>

        <div class="form-group">
          <label>フォントファミリー</label>
          <select value="\${element.fontFamily}" onchange="updateElementProperty('fontFamily', this.value)">
            <option value="Noto Sans JP" \${element.fontFamily === 'Noto Sans JP' ? 'selected' : ''}>Noto Sans JP</option>
            <option value="Noto Serif JP" \${element.fontFamily === 'Noto Serif JP' ? 'selected' : ''}>Noto Serif JP</option>
          </select>
        </div>

        <div class="form-group">
          <label>フォントウェイト</label>
          <select value="\${element.fontWeight}" onchange="updateElementProperty('fontWeight', parseInt(this.value))">
            <option value="400" \${element.fontWeight === 400 ? 'selected' : ''}>400 (Regular)</option>
            <option value="700" \${element.fontWeight === 700 ? 'selected' : ''}>700 (Bold)</option>
          </select>
        </div>

        <div class="form-group">
          <label>テキスト配置</label>
          <select value="\${element.textAlign}" onchange="updateElementProperty('textAlign', this.value)">
            <option value="left" \${element.textAlign === 'left' ? 'selected' : ''}>左揃え</option>
            <option value="center" \${element.textAlign === 'center' ? 'selected' : ''}>中央揃え</option>
            <option value="right" \${element.textAlign === 'right' ? 'selected' : ''}>右揃え</option>
          </select>
        </div>

        <div class="form-group">
          <label>テキスト色</label>
          <input type="color" value="\${element.color}" onchange="updateElementProperty('color', this.value)">
        </div>

        <div class="form-group">
          <label>最大幅（折り返し）</label>
          <input type="number" value="\${element.maxWidth || ''}" min="50" placeholder="未設定" onchange="updateElementProperty('maxWidth', this.value ? parseInt(this.value) : undefined)">
        </div>

        <div class="form-group">
          <label>最大高さ（自動調整）</label>
          <input type="number" value="\${element.maxHeight || ''}" min="20" placeholder="未設定" onchange="updateElementProperty('maxHeight', this.value ? parseInt(this.value) : undefined)">
        </div>

        <div class="form-group">
          <button class="danger" onclick="deleteSelectedElement()" style="width: 100%; padding: 10px;">この要素を削除</button>
        </div>
      \`;
    }

    function updateTemplateProperty(key, value) {
      templateState[key] = value;
      if (key === 'background') renderCanvas();
    }

    function updateBackgroundType(type) {
      let defaultValue = '';
      if (type === 'color') defaultValue = '#1e40ff';
      else if (type === 'upload') defaultValue = templateState.background.value || '';

      templateState.background = { type, value: defaultValue };
      showTemplateProperties();
      renderCanvas();
    }

    function updateCanvasSize() {
      templateState.width = parseInt(document.getElementById('templateWidth').value);
      templateState.height = parseInt(document.getElementById('templateHeight').value);
      renderCanvas();
    }

    async function handleBackgroundUpload(event) {
      const file = event.target ? event.target.files[0] : event.dataTransfer?.files[0];
      if (!file) return;

      // ファイルタイプとサイズのバリデーション
      const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        alert('対応していない画像形式です。PNG, JPEG, GIF, WebP, SVGのみアップロード可能です。');
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('ファイルサイズが大きすぎます。10MB以下のファイルをアップロードしてください。');
        return;
      }

      // アップロード中の表示
      const uploadArea = document.getElementById('uploadArea');
      if (uploadArea) {
        uploadArea.classList.add('uploading');
        uploadArea.innerHTML = '<div class="text">アップロード中...</div>';
      }

      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/images/upload', {
          method: 'POST',
          headers: {
            'x-api-key': API_KEY
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error('アップロードに失敗しました');
        }

        const result = await response.json();

        // 背景画像のURLを更新
        templateState.background = { type: 'upload', value: result.url };
        showTemplateProperties();
        renderCanvas();
      } catch (error) {
        console.error('Upload error:', error);
        alert('画像のアップロードに失敗しました。もう一度お試しください。');
        showTemplateProperties();
      }
    }

    function setupUploadAreaHandlers() {
      const uploadArea = document.getElementById('uploadArea');
      if (!uploadArea) return;

      // ドラッグオーバーイベント
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
      });

      // ドラッグリーブイベント
      uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
      });

      // ドロップイベント
      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        handleBackgroundUpload(e);
      });
    }

    function updateElementProperty(key, value) {
      const element = templateState.elements.find(el => el.id === selectedElementId);
      if (!element) return;

      element[key] = value;
      renderCanvas();
    }

    async function saveTemplate() {
      try {
        if (!templateState.name) {
          alert('テンプレート名を入力してください');
          showTemplateProperties();
          document.getElementById('templateName').focus();
          return;
        }

        if (templateState.elements.length === 0) {
          if (!confirm('テキスト要素がありません。このまま保存しますか？')) return;
        }

        const method = templateState.id ? 'PUT' : 'POST';
        const url = templateState.id ? \`/templates/\${templateState.id}\` : '/templates';

        const { id, createdAt, updatedAt, ...payload } = templateState;

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('保存に失敗しました');

        const savedTemplate = await response.json();
        alert('保存しました！');

        // Redirect to template list
        window.location.href = '/templates/ui';
      } catch (error) {
        alert('エラー: ' + error.message);
      }
    }

    async function previewTemplate() {
      try {
        // Create test data
        const testData = {};
        templateState.elements.forEach(el => {
          testData[el.variable] = \`サンプル\${el.variable}\`;
        });

        // Generate preview
        const response = await fetch('/render', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify({
            template: templateState,
            format: 'png',
            data: testData
          })
        });

        if (!response.ok) throw new Error('プレビュー生成に失敗しました');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Open in new window
        const win = window.open('', '_blank');
        win.document.write(\`<img src="\${url}" style="max-width: 100%; height: auto;">\`);
      } catch (error) {
        alert('エラー: ' + error.message);
      }
    }
  </script>
</body>
</html>
  `;
}
