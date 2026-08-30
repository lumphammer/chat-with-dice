import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { CommittedTextField } from "../shared/CommittedTextField";
import { ProtagonistTrioFields } from "./ProtagonistTrioFields";

const BACKGROUND_ROWS = 3;

/**
 * The Protagonist as a sheet being written: every line editable in place, each
 * one committed on blur. This is the setup-mode counterpart to
 * `ProtagonistSection`, which shows the same sheet as prose once play begins.
 */
export const ProtagonistSetupSection = () => {
  const capInfo = englisheerieClient.useMount();

  if (!capInfo.initialised) {
    return null;
  }

  const { protagonist } = capInfo.state;
  const { setProtagonistLine } = capInfo.actions;

  return (
    <section>
      <h3 className="heading">The Protagonist</h3>
      <p className="muted mt-1 mb-4 text-sm">
        Describe the single protagonist of the story. Multiplayer: take it in
        turns to fill in the fields.
      </p>

      <div className="flex flex-col gap-4">
        <CommittedTextField
          label="Name"
          value={protagonist.name}
          onCommit={(value) => setProtagonistLine({ field: "name", value })}
        />
        <CommittedTextField
          label="Occupation"
          value={protagonist.occupation}
          onCommit={(value) =>
            setProtagonistLine({ field: "occupation", value })
          }
        />
        <CommittedTextField
          label="Background"
          multiline
          rows={BACKGROUND_ROWS}
          value={protagonist.background}
          onCommit={(value) =>
            setProtagonistLine({ field: "background", value })
          }
        />

        <ProtagonistTrioFields
          legend="Defining Features"
          lineLabel="Feature"
          values={protagonist.features}
          onCommit={(index, value) =>
            setProtagonistLine({ field: "features", index, value })
          }
        />
        <ProtagonistTrioFields
          legend="Fears"
          lineLabel="Fear"
          values={protagonist.fears}
          onCommit={(index, value) =>
            setProtagonistLine({ field: "fears", index, value })
          }
        />
      </div>
    </section>
  );
};
