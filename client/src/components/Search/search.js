/* eslint-disable max-len */
import React from 'react';
import Notes from '../../router/noteRoutes.js';
import { useAuth0 } from '@auth0/auth0-react';
import PropTypes from 'prop-types';
import './search.css';

function Search(props) {
  const { user } = useAuth0();

  const searchDataBase = async (e) => {
    if (e.code === 'Enter') {
      if (e.target.value.length < 1) {
        return;
      }
    }
    const userId = user.sub.split('|')[1];

    const searchValue = e.target.value;
    if (searchValue.length === 0) {
      props.searchNotes([], '');
      return;
    }

    if (
      searchValue === '#' ||
      searchValue === '%' ||
      searchValue === '\\' ||
      searchValue === '?' ||
      searchValue === '/' ||
      searchValue === '//'
    ) {
      return;
    }
    e.preventDefault();
    const searchedNotes = await Notes.searchNote(searchValue, userId);
    props.searchNotes(searchedNotes, searchValue);
  };

  return (
    <>
      <input
      id='smallScreen'
        autoComplete="new-password"
        style={{
          borderRadius: '25px',
          height: '30%',
          alignText: 'center',
          width: '13rem',
          marginLeft: '5%',
        }}
        type="text"
        placeholder="Search…"
        onChange={(e) => searchDataBase(e)}
        onKeyUp={(e) => searchDataBase(e)}
      ></input>
    </>
  );
}

export default Search;

Search.propTypes = {
  searchNotes: PropTypes.func,
};
