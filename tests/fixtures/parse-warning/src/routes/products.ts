const router = {
  get(_path: string, _handler: (req: object, res: { json: (data: object) => void }) => void) {}
};

router.get('/products', (_req, res) => {
  res.json([]);
});

export default router;
