/* eslint-disable max-len */

interface UploadPayload {
    note: string;
}

interface ParsedNote {
    date: string;
    text: string;
    star: string;
    userId: string;
}

const ParseNotes = async (
    userId: string,
    listOfNotes: UploadPayload
): Promise<ParsedNote[]> => {
    const stringOfNotes = listOfNotes.note;
    const notes = stringOfNotes.split('\n');
    const arrayOfNotes: ParsedNote[] = [];

    let note: ParsedNote = {
        'date': '',
        'text': '',
        'star': 'None',
        'userId': userId,
    };

    for (let i = 0; i <= notes.length + 1;) {
        let text = '';

        const noteDate = new Date(notes[i]);
        // Was `noteDate != 'Invalid Date'` — comparing a Date object
        // directly to a string. This actually worked correctly at
        // runtime (JS implicitly calls .toString() on the Date for the
        // comparison, and an invalid date's toString() really is the
        // literal string "Invalid Date"), but TypeScript flags direct
        // comparisons between types with no structural overlap. Made
        // the same coercion explicit — behavior is identical, just
        // spelled out instead of implicit.
        if (noteDate.toString() != 'Invalid Date') {
            note['date'] = noteDate.toISOString().split('T')[0];
            i++;
        }

        while (notes[i] != '\n' && (notes[i] != 'undefined' || notes[i] != undefined) && i < notes.length) {
            if (notes[i] === '\r' || notes[i].length === 0) {
                if (i +1 < notes.length &&(notes[i + 1] === '\r' || notes[i + 1].length === 0)) {
                    i++;
                    while (notes[i + 1] === '\r' || notes[i + 1].length === 0) {
                        i++;
                    }
                }
                if (text.length > 0) {
                    note['text'] = text.trim();
                    break;
                }
                i++;
            }
            text = text + '\n' + notes[i];
            i++;
        }

        if (text.length > 0) {
            note['text'] = text.trim();
        }

        arrayOfNotes.push(note);
        note = {
            'date': '',
            'text': '',
            'star': 'None',
            'userId': userId,
        };
        i++;
    }
    return (arrayOfNotes);
};

export default ParseNotes;