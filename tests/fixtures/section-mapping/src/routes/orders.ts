const router = {
  get(_path: string, _handler: (req: { params: { id: string } }, res: { json: (data: object) => void }) => void) {},
  post(_path: string, _handler: (req: { body: object }, res: { json: (data: object) => void }) => void) {}
};

router.get('/orders/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id, status: 'pending' });
});

router.post('/orders', (req, res) => {
  res.json({ id: 'new-order', status: 'created' });
});

export default router;