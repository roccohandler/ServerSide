import { getEmailChannel, getPhoneChannel, type ContactChannel } from '../../lib/contact';
import { Icon } from './Icon';
import type { IconName } from '../../types/content';

/*
 * The phone number and email address are rendered only through these two components,
 * which read them from `content/site.ts`. Nothing else in the application types a
 * contact detail, so changing one changes it everywhere: header, hero, contact page,
 * footer and structured data.
 *
 * While a value is still a placeholder it renders as plain text rather than as a link,
 * so the site can never publish a `tel:` that dials nothing.
 */

interface ChannelLinkProps {
  readonly channel: ContactChannel;
  readonly icon: IconName;
  readonly className?: string;
  readonly showIcon?: boolean;
  readonly label?: string;
}

function ChannelLink({ channel, icon, className, showIcon = true, label }: ChannelLinkProps) {
  const content = (
    <>
      {showIcon ? <Icon name={icon} size={20} /> : null}
      <span>{channel.display}</span>
    </>
  );

  if (!channel.href) {
    return (
      <span className={className} data-placeholder="true">
        {content}
      </span>
    );
  }

  return (
    <a href={channel.href} className={className} aria-label={label}>
      {content}
    </a>
  );
}

export interface ContactLinkProps {
  readonly className?: string;
  readonly showIcon?: boolean;
}

export function PhoneLink({ className, showIcon }: ContactLinkProps) {
  const channel = getPhoneChannel();
  return (
    <ChannelLink
      channel={channel}
      icon="phone"
      className={className}
      showIcon={showIcon}
      label={channel.href ? `Call ${channel.display}` : undefined}
    />
  );
}

export function EmailLink({ className, showIcon }: ContactLinkProps) {
  const channel = getEmailChannel();
  return (
    <ChannelLink
      channel={channel}
      icon="mail"
      className={className}
      showIcon={showIcon}
      label={channel.href ? `Email ${channel.display}` : undefined}
    />
  );
}
