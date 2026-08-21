import React from 'react';
import type { Note } from '../../types';

interface TrackedEmojisProps {
  note: Note;
}

export const TrackedEmojis = (props: TrackedEmojisProps) => {
    return (
        <>
            <div>
                <span>
                    {props.note.look ? (
                        <span
                            role="img"
                            aria-label="eyes"
                            style={{
                                backgroundColor: 'var(--ns-fog)',
                                marginRight: '.4rem',
                                border: '1px solid var(--ns-rule)',
                                borderRadius: '10px 10px 10px 10px',
                                paddingLeft: '4px',
                            }}
                        >
                            {' '}
                👀{' '}
                        </span>
                    ) : null}
                </span>

                <span>
                    {props.note.gym ? (
                        <span role="img" aria-label="arm" className="emoji">
                💪🏼{' '}
                        </span>
                    ) : null}{' '}
                </span>

                <span>
                    {props.note.weed ? (
                        <span role="img" aria-label="leaf" className="emoji">
                🍁{' '}
                        </span>
                    ) : null}{' '}
                </span>

                <span>
                    {props.note.code ? (
                        <span role="img" aria-label="computer guy" className="emoji">
                👨🏻‍💻{' '}
                        </span>
                    ) : null}{' '}
                </span>

                <span>
                    {props.note.read ? (
                        <span role="img" aria-label="books" className="emoji">
                📚{' '}
                        </span>
                    ) : null}{' '}
                </span>

                <span>
                    {props.note.eatOut ? (
                        <span role="img" aria-label="pizza" className="emoji">
                🍕{' '}
                        </span>
                    ) : null}{' '}
                </span>

                <span>
                    {props.note.basketball ? (
                        <span role="img" aria-label="basketball" className="emoji">
                ⛹🏻‍♂️{' '}
                        </span>
                    ) : null}{' '}
                </span>
            </div>
        </>);
};