// import { FC, PropsWithChildren, useState } from 'react'
// import { UserContext } from '../context/context'


// interface UserProviderProps{};

// export const UserProvider: FC<PropsWithChildren<UserProviderProps>> = ({children}) => {

//     const [isLoggedIn, setLogin] = useState<boolean>(false)
//     const performLogin = () => setLogin(true)
//     const performLogout = () => setLogin (false)


//     return(
//         <UserContext.Provider value={{isLoggedIn , performLogin,performLogout }}>
//             {children}
//         </UserContext.Provider>
//     )
// }