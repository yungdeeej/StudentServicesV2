import { loadEnv } from '../core/config/env.js';
import {
  CampusLoginHttpAdapter,
  CampusLoginMockAdapter,
} from './sis/campuslogin.js';
import { SalesforceMockAdapter, SalesforceHttpAdapter } from './sis/salesforce.js';
import type { ISisAdapter } from './types.js';
import { MoodleMockAdapter, MoodleHttpAdapter } from './moodle/index.js';
import { BbbMockAdapter, BbbHttpAdapter } from './bbb/index.js';
import { TwilioMockAdapter, TwilioHttpAdapter } from './twilio/index.js';
import { JustCallMockAdapter, JustCallHttpAdapter } from './justcall/index.js';
import { PandaDocMockAdapter, PandaDocHttpAdapter } from './pandadoc/index.js';
import { GoogleMockAdapter, GoogleHttpAdapter } from './google/index.js';
import { FalMockAdapter, FalHttpAdapter } from './fal/index.js';
import { ClaudeMockAdapter, ClaudeHttpAdapter } from './claude/index.js';
import { SmtpEmailAdapter, MockEmailAdapter } from './email/index.js';
import type {
  IBbbAdapter,
  IClaudeAdapter,
  IEmailAdapter,
  IFalAdapter,
  IGoogleAdapter,
  IJustCallAdapter,
  IMoodleAdapter,
  IPandaDocAdapter,
  ITwilioAdapter,
} from './types.js';

const env = loadEnv();

export type Integrations = {
  sis: ISisAdapter;
  moodle: IMoodleAdapter;
  bbb: IBbbAdapter;
  twilio: ITwilioAdapter;
  justcall: IJustCallAdapter;
  pandadoc: IPandaDocAdapter;
  google: IGoogleAdapter;
  fal: IFalAdapter;
  claude: IClaudeAdapter;
  email: IEmailAdapter;
};

let cached: Integrations | undefined;

export function getIntegrations(): Integrations {
  if (cached) return cached;

  const sis: ISisAdapter =
    env.SIS_ADAPTER === 'campuslogin'
      ? new CampusLoginHttpAdapter()
      : env.SIS_ADAPTER === 'salesforce'
        ? new SalesforceHttpAdapter()
        : new CampusLoginMockAdapter();

  cached = {
    sis,
    moodle: env.MOODLE_ADAPTER === 'http' ? new MoodleHttpAdapter() : new MoodleMockAdapter(),
    bbb: env.BBB_ADAPTER === 'http' ? new BbbHttpAdapter() : new BbbMockAdapter(),
    twilio: env.TWILIO_ADAPTER === 'http' ? new TwilioHttpAdapter() : new TwilioMockAdapter(),
    justcall:
      env.JUSTCALL_ADAPTER === 'http' ? new JustCallHttpAdapter() : new JustCallMockAdapter(),
    pandadoc:
      env.PANDADOC_ADAPTER === 'http' ? new PandaDocHttpAdapter() : new PandaDocMockAdapter(),
    google: env.GOOGLE_ADAPTER === 'http' ? new GoogleHttpAdapter() : new GoogleMockAdapter(),
    fal: env.FAL_ADAPTER === 'http' ? new FalHttpAdapter() : new FalMockAdapter(),
    claude: env.CLAUDE_ADAPTER === 'http' ? new ClaudeHttpAdapter() : new ClaudeMockAdapter(),
    email: env.SMTP_HOST ? new SmtpEmailAdapter() : new MockEmailAdapter(),
  };

  // Sanity log so demo mode is obvious
  // (intentionally not logging adapter selection at info level outside dev)
  if (env.NODE_ENV !== 'production' && !cached.sis.health) {
    throw new Error('SIS adapter missing health()');
  }

  // Salesforce skeleton check — logged once, doesn't block.
  if (env.SIS_ADAPTER === 'salesforce' && !env.SALESFORCE_CLIENT_ID) {
    // eslint-disable-next-line no-console
    console.warn('SIS_ADAPTER=salesforce selected but SALESFORCE_* envs are not set; falling back to mock data.');
  }

  // Stash to suppress no-op type warning for SalesforceMockAdapter import path
  void SalesforceMockAdapter;

  return cached;
}

export function resetIntegrationsCache(): void {
  cached = undefined;
}
