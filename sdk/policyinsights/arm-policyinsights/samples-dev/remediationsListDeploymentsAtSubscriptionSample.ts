/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { PolicyInsightsClient } from "@azure/arm-policyinsights";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * This sample demonstrates how to Gets all deployments for a remediation at subscription scope.
 *
 * @summary Gets all deployments for a remediation at subscription scope.
 * x-ms-original-file: specification/policyinsights/resource-manager/Microsoft.PolicyInsights/stable/2021-10-01/examples/Remediations_ListDeploymentsSubscriptionScope.json
 */
async function listDeploymentsForARemediationAtSubscriptionScope() {
  const subscriptionId = "35ee058e-5fa0-414c-8145-3ebb8d09b6e2";
  const remediationName = "myRemediation";
  const credential = new DefaultAzureCredential();
  const client = new PolicyInsightsClient(credential, subscriptionId);
  const resArray = new Array();
  for await (let item of client.remediations.listDeploymentsAtSubscription(
    remediationName
  )) {
    resArray.push(item);
  }
  console.log(resArray);
}

listDeploymentsForARemediationAtSubscriptionScope().catch(console.error);
