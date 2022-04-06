/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const { PolicyInsightsClient } = require("@azure/arm-policyinsights");
const { DefaultAzureCredential } = require("@azure/identity");

/**
 * This sample demonstrates how to Gets all remediations for the subscription.
 *
 * @summary Gets all remediations for the subscription.
 * x-ms-original-file: specification/policyinsights/resource-manager/Microsoft.PolicyInsights/stable/2021-10-01/examples/Remediations_ListSubscriptionScope.json
 */
async function listRemediationsAtSubscriptionScope() {
  const subscriptionId = "35ee058e-5fa0-414c-8145-3ebb8d09b6e2";
  const credential = new DefaultAzureCredential();
  const client = new PolicyInsightsClient(credential, subscriptionId);
  const resArray = new Array();
  for await (let item of client.remediations.listForSubscription()) {
    resArray.push(item);
  }
  console.log(resArray);
}

listRemediationsAtSubscriptionScope().catch(console.error);

/**
 * This sample demonstrates how to Gets all remediations for the subscription.
 *
 * @summary Gets all remediations for the subscription.
 * x-ms-original-file: specification/policyinsights/resource-manager/Microsoft.PolicyInsights/stable/2021-10-01/examples/Remediations_ListSubscriptionScope_WithQuery.json
 */
async function listRemediationsAtSubscriptionScopeWithQueryParameters() {
  const subscriptionId = "35ee058e-5fa0-414c-8145-3ebb8d09b6e2";
  const top = 1;
  const filter =
    "PolicyAssignmentId eq '/subscriptions/35ee058e-5fa0-414c-8145-3ebb8d09b6e2/providers/microsoft.authorization/policyassignments/b101830944f246d8a14088c5' AND PolicyDefinitionReferenceId eq 'storageSkuDef'";
  const options = {
    top,
    filter,
  };
  const credential = new DefaultAzureCredential();
  const client = new PolicyInsightsClient(credential, subscriptionId);
  const resArray = new Array();
  for await (let item of client.remediations.listForSubscription(options)) {
    resArray.push(item);
  }
  console.log(resArray);
}

listRemediationsAtSubscriptionScopeWithQueryParameters().catch(console.error);
