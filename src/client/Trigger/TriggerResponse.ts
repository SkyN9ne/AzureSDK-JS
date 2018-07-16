import { Trigger } from ".";
import { CosmosResponse } from "../../request";
import { TriggerDefinition } from "./TriggerDefinition";

export interface TriggerResponse extends CosmosResponse<TriggerDefinition, Trigger> {
  trigger: Trigger;
}
