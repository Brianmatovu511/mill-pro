const router = require('express').Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');

const REACTIONS = ['👍', '🔥', '❤️', '😮', '🌽'];

// Shape a post for the client: aggregate reactions + mark current user's reaction
function shapePost(p, userId) {
  const counts = {};
  let myReaction = null;
  for (const r of p.reactions || []) {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    if (r.userId === userId) myReaction = r.emoji;
  }
  return {
    id: p.id, userId: p.userId, userName: p.userName, userRole: p.userRole,
    companyName: p.companyName, body: p.body, createdAt: p.createdAt,
    reactions: counts, myReaction,
    comments: (p.comments || []).map(c => ({ id: c.id, userId: c.userId, userName: c.userName, body: c.body, createdAt: c.createdAt })),
  };
}

// List the global feed (latest 100)
router.get('/posts', authenticate, async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { reactions: true, comments: { orderBy: { createdAt: 'asc' } } },
    });
    res.json(posts.map(p => shapePost(p, req.user.id)));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load feed' }); }
});

// Create a post
router.post('/posts', authenticate, async (req, res) => {
  try {
    const body = (req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message cannot be empty' });
    if (body.length > 4000) return res.status(400).json({ error: 'Message too long' });
    const company = await prisma.company.findUnique({ where: { id: req.companyId }, select: { name: true } });
    const post = await prisma.post.create({
      data: {
        userId: req.user.id, companyId: req.companyId, userName: req.user.name,
        userRole: req.user.role, companyName: company?.name || null, body,
      },
      include: { reactions: true, comments: true },
    });
    res.status(201).json(shapePost(post, req.user.id));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to post' }); }
});

// Delete own post (or any post if OWNER)
router.delete('/posts/:id', authenticate, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.userId !== req.user.id && req.user.role !== 'OWNER') return res.status(403).json({ error: 'Not allowed' });
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Toggle a reaction (same emoji = remove, different = switch, new = add)
router.post('/posts/:id/react', authenticate, async (req, res) => {
  try {
    const emoji = req.body.emoji;
    if (!REACTIONS.includes(emoji)) return res.status(400).json({ error: 'Invalid reaction' });
    const existing = await prisma.postReaction.findUnique({
      where: { postId_userId: { postId: req.params.id, userId: req.user.id } },
    });
    if (existing) {
      if (existing.emoji === emoji) {
        await prisma.postReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.postReaction.update({ where: { id: existing.id }, data: { emoji } });
      }
    } else {
      await prisma.postReaction.create({ data: { postId: req.params.id, userId: req.user.id, emoji } });
    }
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Add a comment
router.post('/posts/:id/comments', authenticate, async (req, res) => {
  try {
    const body = (req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Comment cannot be empty' });
    if (body.length > 2000) return res.status(400).json({ error: 'Comment too long' });
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = await prisma.postComment.create({
      data: { postId: req.params.id, userId: req.user.id, userName: req.user.name, body },
    });
    res.status(201).json(comment);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Delete own comment (or any if OWNER)
router.delete('/comments/:id', authenticate, async (req, res) => {
  try {
    const c = await prisma.postComment.findUnique({ where: { id: req.params.id } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (c.userId !== req.user.id && req.user.role !== 'OWNER') return res.status(403).json({ error: 'Not allowed' });
    await prisma.postComment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
