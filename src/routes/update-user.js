import * as data from '../data/data';
import * as helpers from '../data/helpers';
import * as constants from '../data/constants';

export default async function UpdateUserRoute (req, res) {
  try {
    const name = req.body.name;
    const dailyLimit = req.body.dailyLimit;
    const interfaceLanguageId = req.body.interfaceLanguageId;
    try {
      helpers.validateName(name);
      helpers.validateDailyLimit(dailyLimit);
      helpers.validateInterfaceLanguageId(interfaceLanguageId);
    } catch (e) {
      res.status(403).json({
        errorCode: e.errorCode,
        message: e.message
      });
      return;
    }
    await data.updateUser(req.user.id, {
      name,
      dailyLimit,
      interfaceLanguageId
    });
    res.sendStatus(204);
  } catch (e) {
    // We've tried our best to validate values,
    // so we're not sure how to handle an updateUser error
    res.status(500).json({
      errorCode: constants.ERROR_SERVER_GENERIC,
      message: 'Server error'
    });
  }
}
