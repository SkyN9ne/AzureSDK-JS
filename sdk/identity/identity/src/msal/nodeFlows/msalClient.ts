// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as msal from "@azure/msal-node";

import { AccessToken, GetTokenOptions } from "@azure/core-auth";
import { AuthenticationRecord, CertificateParts } from "../types";
import { CredentialLogger, credentialLogger, formatSuccess } from "../../util/logging";
import { PluginConfiguration, msalPlugins } from "./msalPlugins";
import {
  defaultLoggerCallback,
  ensureValidMsalToken,
  getAuthority,
  getKnownAuthorities,
  getMSALLogLevel,
  handleMsalError,
  msalToPublic,
  publicToMsal,
} from "../utils";

import { AuthenticationRequiredError } from "../../errors";
import { BrokerOptions } from "./brokerOptions";
import { DeviceCodePromptCallback } from "../../credentials/deviceCodeCredentialOptions";
import { IdentityClient } from "../../client/identityClient";
import { TokenCachePersistenceOptions } from "./tokenCachePersistenceOptions";
import { calculateRegionalAuthority } from "../../regionalAuthority";
import { getLogLevel } from "@azure/logger";
import { resolveTenantId } from "../../util/tenantIdUtils";
import { interactiveBrowserMockable } from "./msalOpenBrowser";
import { InteractiveBrowserCredentialNodeOptions } from "../../credentials/interactiveBrowserCredentialOptions";

/**
 * The default logger used if no logger was passed in by the credential.
 */
const msalLogger = credentialLogger("MsalClient");

/**
 * Represents the options for acquiring a token using flows that support silent authentication.
 */
export interface GetTokenWithSilentAuthOptions extends GetTokenOptions {
  /**
   * Disables automatic authentication. If set to true, the method will throw an error if the user needs to authenticate.
   *
   * @remarks
   *
   * This option will be set to `false` when the user calls `authenticate` directly on a credential that supports it.
   */
  disableAutomaticAuthentication?: boolean;
}

/**
 * Represents the options for acquiring a token interactively.
 */
export interface GetTokenInteractiveOptions extends GetTokenWithSilentAuthOptions {
  /**
   * Window handle for parent window, required for WAM authentication.
   */
  parentWindowHandle?: Buffer;
  /**
   * Shared configuration options for browser customization
   */
  browserCustomizationOptions?: InteractiveBrowserCredentialNodeOptions["browserCustomizationOptions"];
  /**
   * loginHint allows a user name to be pre-selected for interactive logins.
   * Setting this option skips the account selection prompt and immediately attempts to login with the specified account.
   */
  loginHint?: string;
}

/**
 * Represents a client for interacting with the Microsoft Authentication Library (MSAL).
 */
export interface MsalClient {
  /**
   * Retrieves an access token by using the on-behalf-of flow and a client certificate of the calling service.
   *
   * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
   * @param userAssertionToken - The access token that was sent to the middle-tier API. This token must have an audience of the app making this OBO request.
   * @param clientCertificate - The client certificate used for authentication.
   * @param options - Additional options that may be provided to the method.
   * @returns An access token.
   */
  getTokenOnBehalfOf(
    scopes: string[],
    userAssertionToken: string,
    clientCertificate: CertificateParts,
    options?: GetTokenOptions,
  ): Promise<AccessToken>;
  /**
   *
   * Retrieves an access token by using the on-behalf-of flow and a client secret of the calling service.
   *
   * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
   * @param userAssertionToken - The access token that was sent to the middle-tier API. This token must have an audience of the app making this OBO request.
   * @param clientSecret - The client secret used for authentication.
   * @param options - Additional options that may be provided to the method.
   * @returns An access token.
   */
  getTokenOnBehalfOf(
    scopes: string[],
    userAssertionToken: string,
    clientSecret: string,
    options?: GetTokenOptions,
  ): Promise<AccessToken>;
  /**
   * Retrieves an access token by using an interactive prompt (InteractiveBrowserCredential).
   * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
   * @param options - Additional options that may be provided to the method.
   * @returns An access token.
   */
  getTokenByInteractiveRequest(
    scopes: string[],
    options: GetTokenInteractiveOptions,
  ): Promise<AccessToken>;
  /**
   * Retrieves an access token by using a user's username and password.
   *
   * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
   * @param username - The username provided by the developer.
   * @param password - The user's password provided by the developer.
   * @param options - Additional options that may be provided to the method.
   * @returns An access token.
   */
  getTokenByUsernamePassword(
    scopes: string[],
    username: string,
    password: string,
    options?: GetTokenOptions,
  ): Promise<AccessToken>;
  /**
   * Retrieves an access token by prompting the user to authenticate using a device code.
   *
   * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
   * @param userPromptCallback - The callback function that allows developers to customize the prompt message.
   * @param options - Additional options that may be provided to the method.
   * @returns An access token.
   */
  getTokenByDeviceCode(
    scopes: string[],
    userPromptCallback: DeviceCodePromptCallback,
    options?: GetTokenWithSilentAuthOptions,
  ): Promise<AccessToken>;
  /**
   * Retrieves an access token by using a client certificate.
   *
   * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
   * @param certificate - The client certificate used for authentication.
   * @param options - Additional options that may be provided to the method.
   * @returns An access token.
   */
  getTokenByClientCertificate(
    scopes: string[],
    certificate: CertificateParts,
    options?: GetTokenOptions,
  ): Promise<AccessToken>;

  /**
   * Retrieves an access token by using a client assertion.
   *
   * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
   * @param clientAssertion - The client assertion used for authentication.
   * @param options - Additional options that may be provided to the method.
   * @returns An access token.
   */
  getTokenByClientAssertion(
    scopes: string[],
    clientAssertion: string,
    options?: GetTokenOptions,
  ): Promise<AccessToken>;

  /**
   * Retrieves an access token by using a client secret.
   *
   * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
   * @param clientSecret - The client secret of the application. This is a credential that the application can use to authenticate itself.
   * @param options - Additional options that may be provided to the method.
   * @returns An access token.
   */
  getTokenByClientSecret(
    scopes: string[],
    clientSecret: string,
    options?: GetTokenOptions,
  ): Promise<AccessToken>;

  /**
   * Retrieves an access token by using an authorization code flow.
   *
   * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
   * @param authorizationCode - An authorization code that was received from following the
                              authorization code flow.  This authorization code must not
                              have already been used to obtain an access token.
   * @param redirectUri - The redirect URI that was used to request the authorization code.
                        Must be the same URI that is configured for the App Registration.
   * @param clientSecret - An optional client secret that was generated for the App Registration.
   * @param options - Additional options that may be provided to the method.
   */
  getTokenByAuthorizationCode(
    scopes: string[],
    redirectUri: string,
    authorizationCode: string,
    clientSecret?: string,
    options?: GetTokenWithSilentAuthOptions,
  ): Promise<AccessToken>;

  /**
   * Retrieves the last authenticated account. This method expects an authentication record to have been previously loaded.
   *
   * An authentication record could be loaded by calling the `getToken` method, or by providing an `authenticationRecord` when creating a credential.
   */
  getActiveAccount(): AuthenticationRecord | undefined;
}

/**
 * Represents the options for configuring the MsalClient.
 */
export interface MsalClientOptions {
  /**
   * Parameters that enable WAM broker authentication in the InteractiveBrowserCredential.
   */
  brokerOptions?: BrokerOptions;

  /**
   * Parameters that enable token cache persistence in the Identity credentials.
   */
  tokenCachePersistenceOptions?: TokenCachePersistenceOptions;

  /**
   * A custom authority host.
   */
  authorityHost?: IdentityClient["tokenCredentialOptions"]["authorityHost"];

  /**
   * Allows users to configure settings for logging policy options, allow logging account information and personally identifiable information for customer support.
   */
  loggingOptions?: IdentityClient["tokenCredentialOptions"]["loggingOptions"];

  /**
   * The token credential options for the MsalClient.
   */
  tokenCredentialOptions?: IdentityClient["tokenCredentialOptions"];

  /**
   * Determines whether instance discovery is disabled.
   */
  disableInstanceDiscovery?: boolean;

  /**
   * The logger for the MsalClient.
   */
  logger?: CredentialLogger;

  /**
   * The authentication record for the MsalClient.
   */
  authenticationRecord?: AuthenticationRecord;
}

/**
 * Generates the configuration for MSAL (Microsoft Authentication Library).
 *
 * @param clientId - The client ID of the application.
 * @param  tenantId - The tenant ID of the Azure Active Directory.
 * @param  msalClientOptions - Optional. Additional options for creating the MSAL client.
 * @returns  The MSAL configuration object.
 */
export function generateMsalConfiguration(
  clientId: string,
  tenantId: string,
  msalClientOptions: MsalClientOptions = {},
): msal.Configuration {
  const resolvedTenant = resolveTenantId(
    msalClientOptions.logger ?? msalLogger,
    tenantId,
    clientId,
  );

  // TODO: move and reuse getIdentityClientAuthorityHost
  const authority = getAuthority(
    resolvedTenant,
    msalClientOptions.authorityHost ?? process.env.AZURE_AUTHORITY_HOST,
  );

  const httpClient = new IdentityClient({
    ...msalClientOptions.tokenCredentialOptions,
    authorityHost: authority,
    loggingOptions: msalClientOptions.loggingOptions,
  });

  const msalConfig: msal.Configuration = {
    auth: {
      clientId,
      authority,
      knownAuthorities: getKnownAuthorities(
        resolvedTenant,
        authority,
        msalClientOptions.disableInstanceDiscovery,
      ),
    },
    system: {
      networkClient: httpClient,
      loggerOptions: {
        loggerCallback: defaultLoggerCallback(msalClientOptions.logger ?? msalLogger),
        logLevel: getMSALLogLevel(getLogLevel()),
        piiLoggingEnabled: msalClientOptions.loggingOptions?.enableUnsafeSupportLogging,
      },
    },
  };
  return msalConfig;
}

/**
 * Represents the state necessary for the MSAL (Microsoft Authentication Library) client to operate.
 * This includes the MSAL configuration, cached account information, Azure region, and a flag to disable automatic authentication.
 *
 * @internal
 */
interface MsalClientState {
  /** The configuration for the MSAL client. */
  msalConfig: msal.Configuration;

  /** The cached account information, or null if no account information is cached. */
  cachedAccount: msal.AccountInfo | null;

  /** Configured plugins */
  pluginConfiguration: PluginConfiguration;

  /** Claims received from challenges, cached for the next request */
  cachedClaims?: string;

  /** The logger instance */
  logger: CredentialLogger;
}

/**
 * Creates an instance of the MSAL (Microsoft Authentication Library) client.
 *
 * @param clientId - The client ID of the application.
 * @param tenantId - The tenant ID of the Azure Active Directory.
 * @param createMsalClientOptions - Optional. Additional options for creating the MSAL client.
 * @returns An instance of the MSAL client.
 *
 * @public
 */
export function createMsalClient(
  clientId: string,
  tenantId: string,
  createMsalClientOptions: MsalClientOptions = {},
): MsalClient {
  const state: MsalClientState = {
    msalConfig: generateMsalConfiguration(clientId, tenantId, createMsalClientOptions),
    cachedAccount: createMsalClientOptions.authenticationRecord
      ? publicToMsal(createMsalClientOptions.authenticationRecord)
      : null,
    pluginConfiguration: msalPlugins.generatePluginConfiguration(createMsalClientOptions),
    logger: createMsalClientOptions.logger ?? msalLogger,
  };

  const publicApps: Map<string, msal.PublicClientApplication> = new Map();
  async function getPublicApp(
    options: GetTokenOptions = {},
  ): Promise<msal.PublicClientApplication> {
    const appKey = options.enableCae ? "CAE" : "default";

    let publicClientApp = publicApps.get(appKey);
    if (publicClientApp) {
      state.logger.getToken.info("Existing PublicClientApplication found in cache, returning it.");
      return publicClientApp;
    }

    // Initialize a new app and cache it
    state.logger.getToken.info(
      `Creating new PublicClientApplication with CAE ${options.enableCae ? "enabled" : "disabled"}.`,
    );

    const cachePlugin = options.enableCae
      ? state.pluginConfiguration.cache.cachePluginCae
      : state.pluginConfiguration.cache.cachePlugin;

    state.msalConfig.auth.clientCapabilities = options.enableCae ? ["cp1"] : undefined;

    publicClientApp = new msal.PublicClientApplication({
      ...state.msalConfig,
      broker: { nativeBrokerPlugin: state.pluginConfiguration.broker.nativeBrokerPlugin },
      cache: { cachePlugin: await cachePlugin },
    });

    publicApps.set(appKey, publicClientApp);

    return publicClientApp;
  }

  const confidentialApps: Map<string, msal.ConfidentialClientApplication> = new Map();
  async function getConfidentialApp(
    options: GetTokenOptions = {},
  ): Promise<msal.ConfidentialClientApplication> {
    const appKey = options.enableCae ? "CAE" : "default";

    let confidentialClientApp = confidentialApps.get(appKey);
    if (confidentialClientApp) {
      state.logger.getToken.info(
        "Existing ConfidentialClientApplication found in cache, returning it.",
      );
      return confidentialClientApp;
    }

    // Initialize a new app and cache it
    state.logger.getToken.info(
      `Creating new ConfidentialClientApplication with CAE ${options.enableCae ? "enabled" : "disabled"}.`,
    );

    const cachePlugin = options.enableCae
      ? state.pluginConfiguration.cache.cachePluginCae
      : state.pluginConfiguration.cache.cachePlugin;

    state.msalConfig.auth.clientCapabilities = options.enableCae ? ["cp1"] : undefined;

    confidentialClientApp = new msal.ConfidentialClientApplication({
      ...state.msalConfig,
      broker: { nativeBrokerPlugin: state.pluginConfiguration.broker.nativeBrokerPlugin },
      cache: { cachePlugin: await cachePlugin },
    });

    confidentialApps.set(appKey, confidentialClientApp);

    return confidentialClientApp;
  }

  async function getTokenSilent(
    app: msal.ConfidentialClientApplication | msal.PublicClientApplication,
    scopes: string[],
    options: GetTokenOptions = {},
  ): Promise<msal.AuthenticationResult> {
    if (state.cachedAccount === null) {
      state.logger.getToken.info(
        "No cached account found in local state, attempting to load it from MSAL cache.",
      );
      const cache = app.getTokenCache();
      const accounts = await cache.getAllAccounts();

      if (accounts === undefined || accounts.length === 0) {
        throw new AuthenticationRequiredError({ scopes });
      }

      if (accounts.length > 1) {
        state.logger
          .info(`More than one account was found authenticated for this Client ID and Tenant ID.
However, no "authenticationRecord" has been provided for this credential,
therefore we're unable to pick between these accounts.
A new login attempt will be requested, to ensure the correct account is picked.
To work with multiple accounts for the same Client ID and Tenant ID, please provide an "authenticationRecord" when initializing a credential to prevent this from happening.`);
        throw new AuthenticationRequiredError({ scopes });
      }

      state.cachedAccount = accounts[0];
    }

    // Keep track and reuse the claims we received across challenges
    if (options.claims) {
      state.cachedClaims = options.claims;
    }

    const silentRequest: msal.SilentFlowRequest = {
      account: state.cachedAccount,
      scopes,
      claims: state.cachedClaims,
    };

    if (state.pluginConfiguration.broker.isEnabled) {
      silentRequest.tokenQueryParameters ||= {};
      if (state.pluginConfiguration.broker.enableMsaPassthrough) {
        silentRequest.tokenQueryParameters["msal_request_type"] = "consumer_passthrough";
      }
    }

    state.logger.getToken.info("Attempting to acquire token silently");
    return app.acquireTokenSilent(silentRequest);
  }

  /**
   * Performs silent authentication using MSAL to acquire an access token.
   * If silent authentication fails, falls back to interactive authentication.
   *
   * @param msalApp - The MSAL application instance.
   * @param scopes - The scopes for which to acquire the access token.
   * @param options - The options for acquiring the access token.
   * @param onAuthenticationRequired - A callback function to handle interactive authentication when silent authentication fails.
   * @returns A promise that resolves to an AccessToken object containing the access token and its expiration timestamp.
   */
  async function withSilentAuthentication(
    msalApp: msal.ConfidentialClientApplication | msal.PublicClientApplication,
    scopes: Array<string>,
    options: GetTokenWithSilentAuthOptions,
    onAuthenticationRequired: () => Promise<msal.AuthenticationResult | null>,
  ): Promise<AccessToken> {
    let response: msal.AuthenticationResult | null = null;
    try {
      response = await getTokenSilent(msalApp, scopes, options);
    } catch (e: any) {
      if (e.name !== "AuthenticationRequiredError") {
        throw e;
      }
      if (options.disableAutomaticAuthentication) {
        throw new AuthenticationRequiredError({
          scopes,
          getTokenOptions: options,
          message:
            "Automatic authentication has been disabled. You may call the authentication() method.",
        });
      }
    }

    // Silent authentication failed
    if (response === null) {
      try {
        response = await onAuthenticationRequired();
      } catch (err: any) {
        throw handleMsalError(scopes, err, options);
      }
    }

    // At this point we should have a token, process it
    ensureValidMsalToken(scopes, response, options);
    state.cachedAccount = response?.account ?? null;

    state.logger.getToken.info(formatSuccess(scopes));

    return {
      token: response.accessToken,
      expiresOnTimestamp: response.expiresOn.getTime(),
    };
  }

  async function getTokenByClientSecret(
    scopes: string[],
    clientSecret: string,
    options: GetTokenOptions = {},
  ): Promise<AccessToken> {
    state.logger.getToken.info(`Attempting to acquire token using client secret`);

    state.msalConfig.auth.clientSecret = clientSecret;

    const msalApp = await getConfidentialApp(options);

    try {
      const response = await msalApp.acquireTokenByClientCredential({
        scopes,
        authority: state.msalConfig.auth.authority,
        azureRegion: calculateRegionalAuthority(),
        claims: options?.claims,
      });
      ensureValidMsalToken(scopes, response, options);

      state.logger.getToken.info(formatSuccess(scopes));

      return {
        token: response.accessToken,
        expiresOnTimestamp: response.expiresOn.getTime(),
      };
    } catch (err: any) {
      throw handleMsalError(scopes, err, options);
    }
  }

  async function getTokenByClientAssertion(
    scopes: string[],
    clientAssertion: string,
    options: GetTokenOptions = {},
  ): Promise<AccessToken> {
    state.logger.getToken.info(`Attempting to acquire token using client assertion`);

    state.msalConfig.auth.clientAssertion = clientAssertion;

    const msalApp = await getConfidentialApp(options);

    try {
      const response = await msalApp.acquireTokenByClientCredential({
        scopes,
        authority: state.msalConfig.auth.authority,
        azureRegion: calculateRegionalAuthority(),
        claims: options?.claims,
        clientAssertion,
      });
      ensureValidMsalToken(scopes, response, options);

      state.logger.getToken.info(formatSuccess(scopes));

      return {
        token: response.accessToken,
        expiresOnTimestamp: response.expiresOn.getTime(),
      };
    } catch (err: any) {
      throw handleMsalError(scopes, err, options);
    }
  }

  async function getTokenByClientCertificate(
    scopes: string[],
    certificate: CertificateParts,
    options: GetTokenOptions = {},
  ): Promise<AccessToken> {
    state.logger.getToken.info(`Attempting to acquire token using client certificate`);

    state.msalConfig.auth.clientCertificate = certificate;

    const msalApp = await getConfidentialApp(options);
    try {
      const response = await msalApp.acquireTokenByClientCredential({
        scopes,
        authority: state.msalConfig.auth.authority,
        azureRegion: calculateRegionalAuthority(),
        claims: options?.claims,
      });
      ensureValidMsalToken(scopes, response, options);

      state.logger.getToken.info(formatSuccess(scopes));

      return {
        token: response.accessToken,
        expiresOnTimestamp: response.expiresOn.getTime(),
      };
    } catch (err: any) {
      throw handleMsalError(scopes, err, options);
    }
  }

  async function getTokenByDeviceCode(
    scopes: string[],
    deviceCodeCallback: DeviceCodePromptCallback,
    options: GetTokenWithSilentAuthOptions = {},
  ): Promise<AccessToken> {
    state.logger.getToken.info(`Attempting to acquire token using device code`);

    const msalApp = await getPublicApp(options);

    return withSilentAuthentication(msalApp, scopes, options, () => {
      const requestOptions: msal.DeviceCodeRequest = {
        scopes,
        cancel: options?.abortSignal?.aborted ?? false,
        deviceCodeCallback,
        authority: state.msalConfig.auth.authority,
        claims: options?.claims,
      };
      const deviceCodeRequest = msalApp.acquireTokenByDeviceCode(requestOptions);
      if (options.abortSignal) {
        options.abortSignal.addEventListener("abort", () => {
          requestOptions.cancel = true;
        });
      }

      return deviceCodeRequest;
    });
  }

  async function getTokenByUsernamePassword(
    scopes: string[],
    username: string,
    password: string,
    options: GetTokenOptions = {},
  ): Promise<AccessToken> {
    state.logger.getToken.info(`Attempting to acquire token using username and password`);

    const msalApp = await getPublicApp(options);

    return withSilentAuthentication(msalApp, scopes, options, () => {
      const requestOptions: msal.UsernamePasswordRequest = {
        scopes,
        username,
        password,
        authority: state.msalConfig.auth.authority,
        claims: options?.claims,
      };

      return msalApp.acquireTokenByUsernamePassword(requestOptions);
    });
  }

  function getActiveAccount(): AuthenticationRecord | undefined {
    if (!state.cachedAccount) {
      return undefined;
    }
    return msalToPublic(clientId, state.cachedAccount);
  }

  async function getTokenByAuthorizationCode(
    scopes: string[],
    redirectUri: string,
    authorizationCode: string,
    clientSecret?: string,
    options: GetTokenWithSilentAuthOptions = {},
  ): Promise<AccessToken> {
    state.logger.getToken.info(`Attempting to acquire token using authorization code`);

    let msalApp: msal.ConfidentialClientApplication | msal.PublicClientApplication;
    if (clientSecret) {
      // If a client secret is provided, we need to use a confidential client application
      // See https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow#request-an-access-token-with-a-client_secret
      state.msalConfig.auth.clientSecret = clientSecret;
      msalApp = await getConfidentialApp(options);
    } else {
      msalApp = await getPublicApp(options);
    }

    return withSilentAuthentication(msalApp, scopes, options, () => {
      return msalApp.acquireTokenByCode({
        scopes,
        redirectUri,
        code: authorizationCode,
        authority: state.msalConfig.auth.authority,
        claims: options?.claims,
      });
    });
  }

  function getTokenOnBehalfOf(
    scopes: string[],
    userAssertionToken: string,
    clientSecret: string,
    options?: GetTokenOptions,
  ): Promise<AccessToken>;
  function getTokenOnBehalfOf(
    scopes: string[],
    userAssertionToken: string,
    clientCertificate: CertificateParts,
    options?: GetTokenOptions,
  ): Promise<AccessToken>;
  async function getTokenOnBehalfOf(
    scopes: string[],
    userAssertionToken: string,
    clientSecretOrCertificate: string | CertificateParts,
    options: GetTokenOptions = {},
  ): Promise<AccessToken> {
    msalLogger.getToken.info(`Attempting to acquire token on behalf of another user`);

    if (typeof clientSecretOrCertificate === "string") {
      // Client secret
      msalLogger.getToken.info(`Using client secret for on behalf of flow`);
      state.msalConfig.auth.clientSecret = clientSecretOrCertificate;
    } else {
      // Client certificate
      msalLogger.getToken.info(`Using client certificate for on behalf of flow`);
      state.msalConfig.auth.clientCertificate = clientSecretOrCertificate;
    }

    const msalApp = await getConfidentialApp(options);
    try {
      const response = await msalApp.acquireTokenOnBehalfOf({
        scopes,
        authority: state.msalConfig.auth.authority,
        claims: options.claims,
        oboAssertion: userAssertionToken,
      });
      ensureValidMsalToken(scopes, response, options);

      msalLogger.getToken.info(formatSuccess(scopes));

      return {
        token: response.accessToken,
        expiresOnTimestamp: response.expiresOn.getTime(),
      };
    } catch (err: any) {
      throw handleMsalError(scopes, err, options);
    }
  }

  async function getTokenByInteractiveRequest(
    scopes: string[],
    options: GetTokenInteractiveOptions = {},
  ): Promise<AccessToken> {
    msalLogger.getToken.info(`Attempting to acquire token interactively`);

    const app = await getPublicApp(options);

    /**
     * A helper function that supports brokered authentication through the MSAL's public application.
     *
     * When options.useDefaultBrokerAccount is true, the method will attempt to authenticate using the default broker account.
     * If the default broker account is not available, the method will fall back to interactive authentication.
     */
    async function getBrokeredToken(
      useDefaultBrokerAccount: boolean,
    ): Promise<msal.AuthenticationResult> {
      msalLogger.verbose("Authentication will resume through the broker");
      const interactiveRequest = createBaseInteractiveRequest();
      if (state.pluginConfiguration.broker.parentWindowHandle) {
        interactiveRequest.windowHandle = Buffer.from(
          state.pluginConfiguration.broker.parentWindowHandle,
        );
      } else {
        // this is a bug, as the pluginConfiguration handler should validate this case.
        msalLogger.warning(
          "Parent window handle is not specified for the broker. This may cause unexpected behavior. Please provide the parentWindowHandle.",
        );
      }

      if (state.pluginConfiguration.broker.enableMsaPassthrough) {
        (interactiveRequest.tokenQueryParameters ??= {})["msal_request_type"] =
          "consumer_passthrough";
      }
      if (useDefaultBrokerAccount) {
        interactiveRequest.prompt = "none";
        msalLogger.verbose("Attempting broker authentication using the default broker account");
      } else {
        msalLogger.verbose("Attempting broker authentication without the default broker account");
      }

      try {
        return await app.acquireTokenInteractive(interactiveRequest);
      } catch (e: any) {
        msalLogger.verbose(`Failed to authenticate through the broker: ${e.message}`);
        // If we tried to use the default broker account and failed, fall back to interactive authentication
        if (useDefaultBrokerAccount) {
          return getBrokeredToken(/* useDefaultBrokerAccount: */ false);
        } else {
          throw e;
        }
      }
    }

    function createBaseInteractiveRequest(): msal.InteractiveRequest {
      return {
        openBrowser: async (url) => {
          await interactiveBrowserMockable.open(url, { wait: true, newInstance: true });
        },
        scopes,
        authority: state.msalConfig.auth.authority,
        claims: options?.claims,
        loginHint: options?.loginHint,
        errorTemplate: options?.browserCustomizationOptions?.errorMessage,
        successTemplate: options?.browserCustomizationOptions?.successMessage,
      };
    }

    return withSilentAuthentication(app, scopes, options, async () => {
      const interactiveRequest = createBaseInteractiveRequest();

      if (state.pluginConfiguration.broker.isEnabled) {
        return getBrokeredToken(state.pluginConfiguration.broker.useDefaultBrokerAccount ?? false);
      }

      return app.acquireTokenInteractive(interactiveRequest);
    });
  }

  return {
    getActiveAccount,
    getTokenByClientSecret,
    getTokenByClientAssertion,
    getTokenByClientCertificate,
    getTokenByDeviceCode,
    getTokenByUsernamePassword,
    getTokenByAuthorizationCode,
    getTokenOnBehalfOf,
    getTokenByInteractiveRequest,
  };
}
