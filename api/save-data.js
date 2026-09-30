module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (!token || token !== expectedPassword) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Invalid security token.' });
    }

    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload.' });
    }

    // Basic structural validation for portfolio data schema
    if (!data.hero || !Array.isArray(data.projects)) {
      return res.status(400).json({ success: false, error: 'Payload failed schema validation. Missing required hero or projects structure.' });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_OWNER || 'maheshthakurbfm-tech';
    const repoName = process.env.GITHUB_REPO || 'mahiiprofile';
    const filePath = 'data.json';
    const branch = process.env.GITHUB_BRANCH || 'main';

    data.updatedAt = new Date().toISOString();
    const formattedContent = JSON.stringify(data, null, 2) + '\n';
    const contentBase64 = Buffer.from(formattedContent, 'utf8').toString('base64');

    if (!githubToken) {
      return res.status(500).json({
        success: false,
        published: false,
        error: 'GITHUB_TOKEN environment variable is not configured on Vercel.'
      });
    }

    // 1. Fetch current file SHA from GitHub API
    const getFileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`;
    const getFileResp = await fetch(getFileUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'Mahesh-Portfolio-CMS',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let currentSha = null;
    if (getFileResp.ok) {
      const fileInfo = await getFileResp.json();
      currentSha = fileInfo.sha;
    } else if (getFileResp.status !== 404) {
      const errText = await getFileResp.text();
      return res.status(getFileResp.status).json({
        success: false,
        error: `GitHub API error fetching data.json: ${errText}`
      });
    }

    // 2. Commit updated data.json to GitHub API
    const updateFileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    const commitBody = {
      message: 'cms: publish production site data',
      content: contentBase64,
      branch: branch
    };
    if (currentSha) {
      commitBody.sha = currentSha;
    }

    const putResp = await fetch(updateFileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mahesh-Portfolio-CMS',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(commitBody)
    });

    const putData = await putResp.json();

    if (putResp.ok) {
      return res.status(200).json({
        success: true,
        published: true,
        message: 'Production site data committed to GitHub and published to Vercel live site.',
        updatedAt: data.updatedAt,
        commitSha: putData.commit ? putData.commit.sha : null
      });
    } else {
      return res.status(putResp.status).json({
        success: false,
        published: false,
        error: (putData && putData.message) ? `GitHub commit failed: ${putData.message}` : 'GitHub commit failed.'
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      published: false,
      error: 'Serverless save failed: ' + err.message
    });
  }
};
