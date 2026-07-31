import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { CommittedTextField } from "./CommittedTextField";

const BACKGROUND_ROWS = 4;

export const ProtagonistSection = () => {
  const capInfo = englisheerieClient.useMount();

  if (!capInfo.initialised) {
    return null;
  }

  const { protagonist } = capInfo.state;
  const { actions } = capInfo;

  return (
    <section>
      <h3 className="heading">The Protagonist</h3>

      <div className="mt-4 flex flex-col gap-4">
        <CommittedTextField
          label="Name"
          value={protagonist.name}
          onCommit={(value) =>
            actions.setProtagonistText({ field: "name", value })
          }
        />
        <CommittedTextField
          label="Occupation"
          value={protagonist.occupation}
          onCommit={(value) =>
            actions.setProtagonistText({ field: "occupation", value })
          }
        />
        <CommittedTextField
          label="Background"
          value={protagonist.background}
          onCommit={(value) =>
            actions.setProtagonistText({ field: "background", value })
          }
          multiline
          rows={BACKGROUND_ROWS}
        />
      </div>

      <h4
        className="text-base-content/50 mt-6 mb-2 text-xs font-semibold
          tracking-wide uppercase"
      >
        Features
      </h4>
      <div className="flex flex-col gap-4">
        {protagonist.features.map((feature, index) => (
          <CommittedTextField
            key={index}
            label={`Feature ${index + 1}`}
            value={feature}
            onCommit={(value) =>
              actions.setProtagonistListItem({
                field: "features",
                index,
                value,
              })
            }
          />
        ))}
      </div>

      <h4
        className="text-base-content/50 mt-6 mb-2 text-xs font-semibold
          tracking-wide uppercase"
      >
        Fears
      </h4>
      <div className="flex flex-col gap-4">
        {protagonist.fears.map((fear, index) => (
          <CommittedTextField
            key={index}
            label={`Fear ${index + 1}`}
            value={fear}
            onCommit={(value) =>
              actions.setProtagonistListItem({ field: "fears", index, value })
            }
          />
        ))}
      </div>
    </section>
  );
};
