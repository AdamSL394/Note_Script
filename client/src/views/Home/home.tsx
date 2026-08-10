import React from 'react';
import Nav from '../../components/Navbar/nav';
import { HomeView } from '../../components/HomeView/homeView';

export default function Home() {
  return (
    <div>
      <Nav></Nav>
      <HomeView></HomeView>
    </div>
  );
}