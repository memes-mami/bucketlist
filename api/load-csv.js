export default async function handler(req, res) {
  const {
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_TOKEN,
    CSV_PATH = 'data/bucket_list.csv',
    BRANCH = 'main'
  } = process.env;

  const apiBase = 'https://api.github.com';
  const getUrl = `${apiBase}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(CSV_PATH)}?ref=${encodeURIComponent(BRANCH)}`;

  try {
    const getResp = await fetch(getUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json'
      }
    });

    if (getResp.status !== 200) {
      res.status(getResp.status).json({ error: 'CSV not found' });
      return;
    }

    const data = await getResp.json();
    const csv = Buffer.from(data.content, 'base64').toString('utf8');
    res.status(200).json({ csv });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}