import { GithubIcon } from "#/components/GithubIcon";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { memo } from "react";

const repoUrl = "https://github.com/lumphammer/chat-with-dice";
const issuesUrl = `${repoUrl}/issues`;

export const Help = memo(() => {
  return (
    <SidebarPanel title="Help" isSaving={false}>
      <div className="prose prose-sm mt-4 max-w-none">
        <p>
          <strong>Chat with Dice</strong> lets you chat and roll dice with your
          gaming group in a shared room.
        </p>

        <h3>Chatting</h3>
        <p>
          Type a message and press <kbd className="kbd kbd-sm">Enter</kbd> to
          send. Use <kbd className="kbd kbd-sm">Shift</kbd>+
          <kbd className="kbd kbd-sm">Enter</kbd> for a new line. Basic markdown
          is supported — <em>*italic*</em>, <strong>**bold**</strong>, links,
          lists, and so on.
        </p>

        <h3>The sidebar</h3>
        <p>
          The icons on the left of the sidebar switch between panels. Click the
          active icon again to collapse the sidebar and give yourself more room
          for the chat.
        </p>

        <p>
          Not every room has every panel — the room owner picks which ones are
          enabled in the <strong>Config</strong> panel (cog icon, owner only).
        </p>

        <h3>Inviting people</h3>
        <p>
          Just share the room's URL. Anyone with the link can join and chat —
          they don't need an account, just a display name.
        </p>

        <h3>Feedback &amp; issues</h3>
        <p>
          Chat with Dice is open source. If you hit a bug, have an idea, or want
          to see how it works, head over to the project on GitHub:
        </p>
        <p>
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="link link-primary inline-flex items-center gap-2
              no-underline hover:underline"
          >
            <GithubIcon />
            lumphammer/chat-with-dice
          </a>
        </p>
        <p>
          Please{" "}
          <a
            href={issuesUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="link link-primary"
          >
            log any issues or feature requests
          </a>{" "}
          on the GitHub issue tracker. A clear description of what you expected
          versus what happened — and steps to reproduce — makes triaging much
          easier.
        </p>
      </div>
    </SidebarPanel>
  );
});

Help.displayName = "Help";
