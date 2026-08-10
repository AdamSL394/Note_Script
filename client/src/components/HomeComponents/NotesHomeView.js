import React from 'react';
import Card from '@mui/material/Card/index.js';
import Grid from '@mui/material/Grid/index.js';

export const HomeNotes = (props) => {
  const renderNoteCard = (note, i) => {
    return (
      <Grid
        alignItems="flex-start"
        key={i + 101}
        item
        xs={12}
        sm={6}
        md={4}
        lg={3}
      >
        <Card key={i + 102} style={{ marginBottom: '2%' }} variant="outlined">
          <div
            key={i + 104}
            style={{
              marginBottom: '5%',
              borderBottom: '1px solid #cbcbcb',
            }}
          >
            <span style={{ marginRight: '12%' }}>
              {' '}
              <strong>{note.date}</strong>
            </span>
            <strong>
              <span role="img" aria-label="checkmark">
                {' '}
                ✨
              </span>
              &apos;s:&nbsp; {note.star}
            </strong>
          </div>
          {note.text.split('\n').map((i, key) => {
            if (i.length === 0) {
              return null;
            }
            const firstLetter = i[0].toUpperCase();
            const restOfsentence = i.slice(1, i.length);
            return (
              <ul key={key} style={{ textAlign: 'left' }}>
                <li style={{ padding: '5px 3px ' }}>
                  {firstLetter + restOfsentence}
                </li>
              </ul>
            );
          })}

          <div key={i + 105} style={{ borderTop: '1px solid #cbcbcb' }}>
            <span>
              {note.look ? (
                <span
                  role="img"
                  aria-label="Eyes"
                  style={{
                    backgroundColor: 'lightgrey',
                    marginRight: '.4rem',
                    border: '2px lightgrey',
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
              {note.gym ? (
                <span
                  role="img"
                  aria-label="arm"
                  style={{
                    backgroundColor: '#ffffff',
                    marginRight: '.4rem',
                    cursor: 'pointer',
                  }}
                >
                  💪🏼{' '}
                </span>
              ) : null}{' '}
            </span>

            <span>
              {note.weed ? (
                <span
                  role="img"
                  aria-label="Leaf"
                  style={{
                    backgroundColor: '#ffffff',
                    marginRight: '.4rem',
                    cursor: 'pointer',
                  }}
                >
                  🍁{' '}
                </span>
              ) : null}{' '}
            </span>

            <span>
              {note.code ? (
                <span
                  role="img"
                  aria-label="Computer guy"
                  style={{
                    backgroundColor: '#ffffff',
                    marginRight: '.4rem',
                    cursor: 'pointer',
                  }}
                >
                  👨🏻‍💻{' '}
                </span>
              ) : null}{' '}
            </span>

            <span>
              {note.read ? (
                <span
                  role="img"
                  aria-label="Books"
                  style={{
                    backgroundColor: '#ffffff',
                    marginRight: '.4rem',
                    cursor: 'pointer',
                  }}
                >
                  📚{' '}
                </span>
              ) : null}{' '}
            </span>

            <span>
              {note.eatOut ? (
                <span
                  role="img"
                  aria-label="Pizza"
                  style={{
                    backgroundColor: '#ffffff',
                    marginRight: '.4rem',
                    cursor: 'pointer',
                  }}
                >
                  🍕{' '}
                </span>
              ) : null}{' '}
            </span>

            <span>
              {note.basketball ? (
                <span
                  role="img"
                  aria-label="Basketball"
                  style={{
                    backgroundColor: '#ffffff',
                    marginRight: '.4rem',
                    cursor: 'pointer',
                  }}
                >
                  ⛹🏻‍♂️{' '}
                </span>
              ) : null}{' '}
            </span>

            <span>
              {note.king ? (
                <span
                  role="img"
                  aria-label="Basketball"
                  style={{
                    backgroundColor: '#ffffff',
                    marginRight: '.4rem',
                    cursor: 'pointer',
                  }}
                >
                  🤴🏻{' '}
                </span>
              ) : null}{' '}
            </span>

            <span>
              {note.medal ? (
                <span
                  role="img"
                  aria-label="Basketball"
                  style={{
                    backgroundColor: '#ffffff',
                    marginRight: '.4rem',
                    cursor: 'pointer',
                  }}
                >
                  🥇{' '}
                </span>
              ) : null}{' '}
            </span>

            <span>
              {note['date/smoosh'] ? (
                <span
                  role="img"
                  aria-label="Basketball"
                  style={{
                    backgroundColor: '#ffffff',
                    marginRight: '.4rem',
                    cursor: 'pointer',
                  }}
                >
                  👫
                </span>
              ) : null}{' '}
            </span>
          </div>
        </Card>
      </Grid>
    );
  };

  return (
    <>
      {props.notes.map((note, i) => renderNoteCard(note, i))}
    </>
  );
};