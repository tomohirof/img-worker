/**
 * /templates/ui エンドポイント用のHTMLテンプレート
 * テンプレート管理UI
 */
export function getTemplatesUiHtml(): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>テンプレート管理</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 1200px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    h1 { color: #333; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    button:hover { background: #0056b3; }
    button.danger { background: #dc3545; }
    button.danger:hover { background: #c82333; }
    .templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .template-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: white; }
    .template-card h3 { margin: 0 0 10px 0; color: #333; }
    .template-card p { margin: 5px 0; color: #666; font-size: 14px; }
    .template-actions { margin-top: 15px; display: flex; gap: 10px; }
    .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; z-index: 1000; }
    .modal.active { display: flex; }
    .modal-content { background: white; padding: 30px; border-radius: 8px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; font-weight: 600; color: #555; }
    input, textarea { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: monospace; }
    textarea { min-height: 400px; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .error { color: #dc3545; margin-top: 10px; padding: 10px; background: #f8d7da; border-radius: 4px; display: none; }
    .success { color: #155724; margin-top: 10px; padding: 10px; background: #d4edda; border-radius: 4px; display: none; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>テンプレート管理</h1>
    <button onclick="window.location.href='/templates/editor'">ビジュアルエディタで新規作成</button>
    <button onclick="showCreateModal()" class="secondary" style="background: #6c757d;">JSON形式で新規作成</button>
  </div>

  <div class="error" id="errorMsg"></div>
  <div class="success" id="successMsg"></div>

  <div class="templates-grid" id="templatesGrid">
    <p>読み込み中...</p>
  </div>

  <!-- Create/Edit Modal -->
  <div class="modal" id="templateModal">
    <div class="modal-content">
      <h2 id="modalTitle">新規テンプレート作成</h2>

      <div class="form-group">
        <label for="templateName">テンプレート名</label>
        <input type="text" id="templateName" placeholder="例: Tutorial Template">
      </div>

      <div class="form-group">
        <label for="templateJson">テンプレート定義（JSON）</label>
        <textarea id="templateJson" placeholder='{\n  "width": 1200,\n  "height": 630,\n  "background": { "type": "color", "value": "#1e40ff" },\n  "elements": [\n    {\n      "id": "title",\n      "variable": "title",\n      "x": 100,\n      "y": 300,\n      "maxWidth": 1000,\n      "maxHeight": 250,\n      "fontSize": 72,\n      "minFontSize": 36,\n      "fontFamily": "Noto Serif JP",\n      "color": "#ffffff",\n      "fontWeight": 700,\n      "textAlign": "left"\n    },\n    {\n      "id": "category",\n      "variable": "category",\n      "x": 100,\n      "y": 200,\n      "maxWidth": 800,\n      "maxHeight": 80,\n      "fontSize": 24,\n      "fontFamily": "Noto Sans JP",\n      "color": "#ffff00",\n      "fontWeight": 400,\n      "textAlign": "left"\n    }\n  ]\n}'></textarea>
      </div>

      <div class="modal-actions">
        <button onclick="closeModal()" style="background: #6c757d;">キャンセル</button>
        <button onclick="saveTemplate()">保存</button>
      </div>
    </div>
  </div>

  <script>
    const API_KEY = sessionStorage.getItem('ogp_api_key') || prompt('APIキーを入力してください');
    if (API_KEY) sessionStorage.setItem('ogp_api_key', API_KEY);
    let templates = [];
    let editingTemplateId = null;

    async function loadTemplates() {
      try {
        const response = await fetch('/templates', {
          headers: { 'x-api-key': API_KEY }
        });

        if (!response.ok) throw new Error('テンプレートの読み込みに失敗しました');

        templates = await response.json();
        renderTemplates();
      } catch (error) {
        showError(error.message);
      }
    }

    function renderTemplates() {
      const grid = document.getElementById('templatesGrid');

      if (templates.length === 0) {
        grid.innerHTML = '<p>テンプレートがありません。新規作成してください。</p>';
        return;
      }

      grid.innerHTML = templates.map(template => \`
        <div class="template-card">
          <h3>\${template.name}</h3>
          <p><strong>サイズ:</strong> \${template.width}x\${template.height}px</p>
          <p><strong>要素数:</strong> \${template.elements.length}</p>
          <p><strong>作成日:</strong> \${new Date(template.createdAt).toLocaleString('ja-JP')}</p>
          <div class="template-actions">
            <button onclick="window.location.href='/templates/editor?id=\${template.id}'">ビジュアル編集</button>
            <button onclick="editTemplate('\${template.id}')" style="background: #6c757d;">JSON編集</button>
            <button class="danger" onclick="deleteTemplate('\${template.id}')">削除</button>
          </div>
        </div>
      \`).join('');
    }

    function showCreateModal() {
      editingTemplateId = null;
      document.getElementById('modalTitle').textContent = '新規テンプレート作成';
      document.getElementById('templateName').value = '';
      document.getElementById('templateJson').value = '';
      document.getElementById('templateModal').classList.add('active');
    }

    function viewTemplate(id) {
      const template = templates.find(t => t.id === id);
      if (!template) return;

      alert(\`テンプレート詳細:\\n\${JSON.stringify(template, null, 2)}\`);
    }

    function editTemplate(id) {
      const template = templates.find(t => t.id === id);
      if (!template) return;

      editingTemplateId = id;
      document.getElementById('modalTitle').textContent = 'テンプレート編集';
      document.getElementById('templateName').value = template.name;

      const { id: _, createdAt, updatedAt, ...templateData } = template;
      document.getElementById('templateJson').value = JSON.stringify(templateData, null, 2);

      document.getElementById('templateModal').classList.add('active');
    }

    async function saveTemplate() {
      try {
        const name = document.getElementById('templateName').value.trim();
        const jsonText = document.getElementById('templateJson').value.trim();

        if (!name) throw new Error('テンプレート名を入力してください');
        if (!jsonText) throw new Error('テンプレート定義を入力してください');

        let templateData;
        try {
          templateData = JSON.parse(jsonText);
        } catch {
          throw new Error('JSON形式が正しくありません');
        }

        templateData.name = name;

        const url = editingTemplateId ? \`/templates/\${editingTemplateId}\` : '/templates';
        const method = editingTemplateId ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify(templateData)
        });

        if (!response.ok) throw new Error('保存に失敗しました');

        showSuccess(editingTemplateId ? 'テンプレートを更新しました' : 'テンプレートを作成しました');
        closeModal();
        await loadTemplates();
      } catch (error) {
        showError(error.message);
      }
    }

    async function deleteTemplate(id) {
      if (!confirm('このテンプレートを削除しますか？')) return;

      try {
        const response = await fetch(\`/templates/\${id}\`, {
          method: 'DELETE',
          headers: { 'x-api-key': API_KEY }
        });

        if (!response.ok) throw new Error('削除に失敗しました');

        showSuccess('テンプレートを削除しました');
        await loadTemplates();
      } catch (error) {
        showError(error.message);
      }
    }

    function closeModal() {
      document.getElementById('templateModal').classList.remove('active');
    }

    function showError(message) {
      const errorMsg = document.getElementById('errorMsg');
      errorMsg.textContent = message;
      errorMsg.style.display = 'block';
      setTimeout(() => { errorMsg.style.display = 'none'; }, 5000);
    }

    function showSuccess(message) {
      const successMsg = document.getElementById('successMsg');
      successMsg.textContent = message;
      successMsg.style.display = 'block';
      setTimeout(() => { successMsg.style.display = 'none'; }, 3000);
    }

    // Load templates on page load
    loadTemplates();
  </script>
</body>
</html>
  `;
}
