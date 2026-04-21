"use client";
import useSweetAlert from "@/hooks/useSweetAlert";
import addItemsToLocalstorage from "@/libs/addItemsToLocalstorage";
import getItemsFromLocalstorage from "@/libs/getItemsFromLocalstorage";
import { createContext, useContext, useEffect, useState } from "react";

const cartContext = createContext(null);

const CartContextProvider = ({ children }) => {
  const [cartProducts, setCartProducts] = useState([]);
  const creteAlert = useSweetAlert();

  useEffect(() => {
    const cartProductFromLocalStorage = getItemsFromLocalstorage("cart");
    if (cartProductFromLocalStorage) {
      setCartProducts(cartProductFromLocalStorage);
    }
  }, []);

  // add product to cart
  const addProductToCart = (currentProduct, showAlert = true, updateOnly = false) => {
    const { id: currentId, title: currentTitle, quantity = 1 } = currentProduct;

    const modifyableProduct = cartProducts?.find(
      ({ id, title }) => id === currentId && title === currentTitle
    );

    if (modifyableProduct && !updateOnly) {
      if (showAlert) {
        creteAlert("error", "Failed ! Already exist in cart.");
      }
    } else {
      let currentProducts;
      if (modifyableProduct && updateOnly) {
        // Update existing product quantity
        currentProducts = cartProducts?.map((product) =>
          product.id === currentId && product.title === currentTitle
            ? { ...product, quantity }
            : product
        );
      } else {
        // Add new product
        currentProducts = [...cartProducts, { ...currentProduct, quantity }];
      }
      setCartProducts(currentProducts);
      addItemsToLocalstorage("cart", currentProducts);
      if (showAlert && !updateOnly) {
        creteAlert("success", "Success! added to cart.");
      }
    }
  };

  // delete product from cart
  const deleteProductFromCart = (currentId, currentTitle) => {
    const currentProducts = cartProducts?.filter(
      ({ id, title }) => id !== currentId || title !== currentTitle
    );
    setCartProducts(currentProducts);
    addItemsToLocalstorage("cart", currentProducts);
    creteAlert("success", "Success! deleted from cart.");
  };

  return (
    <cartContext.Provider
      value={{
        cartProducts,
        setCartProducts,
        addProductToCart,
        deleteProductFromCart,
      }}
    >
      {children}
    </cartContext.Provider>
  );
};

export const useCartContext = () => {
  const value = useContext(cartContext);
  return value;
};

export default CartContextProvider;

