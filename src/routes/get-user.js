import * as helpers from '../data/helpers';

export default async function GetUserRoute (req, res) {
  res.send(helpers.getUserSettings(req.user));
}
