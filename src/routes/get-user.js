export default async function GetUserRoute (req, res) {
  res.send(req.user);
}
