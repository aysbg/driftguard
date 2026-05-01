const router = {
  get(_path: string, _handler: (req: { params: { id: string } }, res: { json: (data: object) => void }) => void) {}
};

router.get('/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id, name: 'Test User' });
});

export default router;