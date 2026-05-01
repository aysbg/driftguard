const router = {
  get(_path: string, _handler: (req: object, res: { json: (data: object) => void }) => void) {}
};

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;