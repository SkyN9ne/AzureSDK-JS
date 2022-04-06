/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  PolicyEventsListQueryResultsForManagementGroupOptionalParams,
  PolicyInsightsClient
} from "@azure/arm-policyinsights";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * This sample demonstrates how to Queries policy events for the resources under the management group.
 *
 * @summary Queries policy events for the resources under the management group.
 * x-ms-original-file: specification/policyinsights/resource-manager/Microsoft.PolicyInsights/stable/2019-10-01/examples/PolicyEvents_QueryManagementGroupScope.json
 */
async function queryAtManagementGroupScope() {
  const subscriptionId = "00000000-0000-0000-0000-000000000000";
  const policyEventsResource = "default";
  const managementGroupName = "myManagementGroup";
  const credential = new DefaultAzureCredential();
  const client = new PolicyInsightsClient(credential, subscriptionId);
  const resArray = new Array();
  for await (let item of client.policyEvents.listQueryResultsForManagementGroup(
    policyEventsResource,
    managementGroupName
  )) {
    resArray.push(item);
  }
  console.log(resArray);
}

queryAtManagementGroupScope().catch(console.error);

/**
 * This sample demonstrates how to Queries policy events for the resources under the management group.
 *
 * @summary Queries policy events for the resources under the management group.
 * x-ms-original-file: specification/policyinsights/resource-manager/Microsoft.PolicyInsights/stable/2019-10-01/examples/PolicyEvents_QueryManagementGroupScopeNextLink.json
 */
async function queryAtManagementGroupScopeWithNextLink() {
  const subscriptionId = "00000000-0000-0000-0000-000000000000";
  const policyEventsResource = "default";
  const managementGroupName = "myManagementGroup";
  const skipToken = "WpmWfBSvPhkAK6QD";
  const options: PolicyEventsListQueryResultsForManagementGroupOptionalParams = {
    skipToken
  };
  const credential = new DefaultAzureCredential();
  const client = new PolicyInsightsClient(credential, subscriptionId);
  const resArray = new Array();
  for await (let item of client.policyEvents.listQueryResultsForManagementGroup(
    policyEventsResource,
    managementGroupName,
    options
  )) {
    resArray.push(item);
  }
  console.log(resArray);
}

queryAtManagementGroupScopeWithNextLink().catch(console.error);
