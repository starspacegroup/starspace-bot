import { ObjectId } from "mongodb"

export default class NumberSetting {
  constructor(
    public name: NumberSettingType,
    public value: number,
    public guildId: string,
    public id?: ObjectId
  ) {}
}

export type NumberSettingType =
  | "botJoinSecondsCamera" // camera warn time
  | "botJoinSecondsScreenshare" // screenshare warn time
  | "userDisconnectSecondsCamera" // camera kick time
  | "userDisconnectSecondsScreenshare" // screenshare kick time
  | "userTimeoutAfterXInfractionsCamera" // camera timeout
  | "userTimeoutAfterXInfractionsScreenshare" // screenshare timeout
  | "timeoutLengthMinutesCamera" // camera timeout minutes
  | "timeoutLengthMinutesScreenshare" // screenshare timeout minutes
  | "enabledOnServer" // enabled on server
