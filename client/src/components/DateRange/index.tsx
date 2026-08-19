import React, { useState } from 'react';
import './dateRange.css';

interface DateRangeProps {
  runDateSearch: (
    date1: string | undefined,
    date2: string | undefined
  ) => void;
  // Passed in from SearchNotes but never actually used inside this
  // component — kept in the type to match reality rather than hiding it.
  setCurrentDBCall?: (value: string | number) => void;
}

export const DateRange = (props: DateRangeProps) => {
    const [startDate, setStartDate] = useState<string | undefined>();
    const [endDate, setEndDate] = useState<string | undefined>();

    const settingStartDate = (
        e: React.ChangeEvent<HTMLInputElement>,
        endDate: string | undefined
    ) => {
        setStartDate(e.target.value);
        const dateSelectionStartDate = e.target.value;
        props.runDateSearch(dateSelectionStartDate, endDate);
    };

    const settingEndDate = (
        startDate: string | undefined,
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setEndDate(e.target.value);
        const dateSelectionEndDate = e.target.value;
        props.runDateSearch(startDate, dateSelectionEndDate);
    };

    return (
        <span id="dateInput">
            <div id="dateRange">
                <input
                    type="date"
                    onChange={(e) => settingStartDate(e, endDate)}
                    className="date"
                ></input>
                <input
                    type="date"
                    onChange={(e) => settingEndDate(startDate, e)}
                    className="date"
                ></input>
            </div>
        </span>
    );
};