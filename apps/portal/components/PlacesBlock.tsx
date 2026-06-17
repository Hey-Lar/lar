'use client';

// Use the connector's exported (total) resolution type so the contract — every
// map link is always present — propagates end-to-end and the primary OSM CTA
// can never silently disappear behind a Partial.
import { Icon } from '@lar/ui';
import type { PlaceResolution } from '@lar/connector-places';
import { AskBar } from './AskBar';
import { useAskLar } from '../lib/useAskLar';

export function PlacesBlock() {
  const ask = useAskLar<PlaceResolution>({
    kind: 'place',
    forceDomain: 'place',
    initial: 'Time Out Market Lisbon',
  });

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Hey Lar</div>
          <h1 className="h1">Places</h1>
        </div>
      </div>
      <p className="lead">
        Say or type a place. Lar finds it via OpenStreetMap and routes you to your map app — it
        never embeds a map or stores where you are.
      </p>

      <AskBar
        value={ask.text}
        onChange={ask.setText}
        onSubmit={() => ask.run(ask.text)}
        onMic={ask.mic}
        loading={ask.loading}
        listening={ask.listening}
        placeholder="Time Out Market Lisbon"
      />

      {ask.msg && (
        <div className="err" role="status" aria-live="polite">
          {ask.msg}
        </div>
      )}

      {ask.res && (
        <div className="np card">
          <div className="np-head">
            <div>
              <div className="np-title">{ask.res.name}</div>
              {ask.res.address && <div className="np-artist">{ask.res.address}</div>}
              {(ask.res.category || ask.res.type) && (
                <div className="np-artist" style={{ opacity: 0.6 }}>
                  {[ask.res.category, ask.res.type].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>

          {/* PRIMARY: OpenStreetMap — neutral open-data map, no commercial lock-in */}
          <a className="open" href={ask.res.links.openstreetmap} target="_blank" rel="noreferrer">
            Open in OpenStreetMap <Icon name="route" size={14} className="chip-arrow" />
          </a>

          <div className="avail">
            <span className="avail-l">Find on</span>
            <a href={ask.res.links.directions} target="_blank" rel="noreferrer" className="chip">
              Directions
            </a>
            <a href={ask.res.links.google_maps} target="_blank" rel="noreferrer" className="chip">
              Google Maps
            </a>
            <a href={ask.res.links.apple_maps} target="_blank" rel="noreferrer" className="chip">
              Apple Maps
            </a>
            <a href={ask.res.links.waze} target="_blank" rel="noreferrer" className="chip">
              Waze
            </a>
          </div>

          <div className="note">
            Lar routes you out — open-data first (OpenStreetMap), then your map app. It never tracks
            or stores where you are.
          </div>
        </div>
      )}
    </div>
  );
}
