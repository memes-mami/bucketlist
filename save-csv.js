export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const {
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_TOKEN,
    CSV_PATH = 'data/bucket_list.csv',
    BRANCH = 'main'
  } = process.env;

  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
    res.status(500).json({ error: 'Missing GitHub configuration in environment' });
    return;
  }

  const item = req.body;
  if (!item || !item.title) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  function csvEscape(field) {
    if (field === null || field === undefined) return '';
    return `"${String(field).replace(/"/g, '""')}"`;
  }

  const row = [
    csvEscape(item.title),
    csvEscape(item.category),
    csvEscape(item.description || ''),
    csvEscape(item.scheduledDate ? new Date(item.scheduledDate).toLocaleString() : ''),
    csvEscape(item.completed ? 'Yes' : 'No'),
    csvEscape(item.createdAt ? new Date(item.createdAt).toLocaleString() : ''),
    csvEscape(item.createdBy || '')
  ].join(',') + '\n';

  const apiBase = 'https://api.github.com';
  const getUrl = `${apiBase}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(CSV_PATH)}?ref=${encodeURIComponent(BRANCH)}`;

  try {
    // fetch existing file (to get sha) or detect 404
    const getResp = await fetch(getUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json'
      }
    });

    let newContent;
    let sha;

    if (getResp.status === 200) {
      const data = await getResp.json();
      sha = data.sha;
      const existing = Buffer.from(data.content, 'base64').toString('utf8');
      newContent = existing + row;
    } else if (getResp.status === 404) {
      // create file with header + row
      const header = 'Title,Category,Description,Scheduled Date,Completed,Created At,Created By\n';
      newContent = header + row;
    } else {
      const errText = await getResp.text();
      throw new Error(`Failed fetching file: ${getResp.status} ${errText}`);
    }

    const putUrl = `${apiBase}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(CSV_PATH)}`;

    const putBody = {
      message: `Update bucket list CSV: add "${item.title}"`,
      content: Buffer.from(newContent, 'utf8').toString('base64'),
      branch: BRANCH
    };
    if (sha) putBody.sha = sha;

    const putResp = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    if (!putResp.ok) {
      const errJson = await putResp.json().catch(() => ({}));
      throw new Error(`GitHub update failed: ${putResp.status} ${JSON.stringify(errJson)}`);
    }

    const result = await putResp.json();
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('save-csv error:', err);
    res.status(500).json({ error: String(err) });
  }
}