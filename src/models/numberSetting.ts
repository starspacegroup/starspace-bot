import { ObjectId } from "mongodb"

export default class NumberSetting {
  constructor(
    public name: NumberSettingType,
    public value: number,
    public id?: ObjectId
  ) {}
}

type NumberSettingType =
  | "botJoinSeconds" // warn time
  | "userDisconnectSeconds" // kick time
  | "userTimeoutAfterXInfractions" // timeout
  | "timeoutLengthMinutes" // timeout minutes
