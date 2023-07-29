import { ObjectId } from "mongodb"

export default class TimeSetting {
  constructor(
    public name: TimeSettingType,
    public value: number,
    public id?: ObjectId
  ) {}
}

type TimeSettingType =
  | "botJoin"
  | "userDisconnect"
  | "userTimeout"
  | "timeoutLength"
