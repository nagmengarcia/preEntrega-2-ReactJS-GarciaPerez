import { useContext, useState } from "react";
import Form from "./Form";
import { CartContext } from "../../context/CartContext";
import { addDoc, collection, doc, setDoc, Timestamp } from "firebase/firestore";
import db from "../../db/db.js";
import validateForm from "../../utils/yupValidation.js";
import { toast } from "react-toastify";
import "./Checkout.css";

const Checkout = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    mail: "",
    mailConfirmation: "",
  });

  const [orderId, setOrderId] = useState(null);

  const { cart, totalPrice, deleteCart } = useContext(CartContext);

  const handleChangeInput = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const mailCoincidenceChecker = () => {
    let mail1 = formData.mail;
    let mail2 = formData.mailConfirmation;

    if (mail1 === mail2 && mail1 !== "") {
      return true;
    } else {
      return false;
    }
  };

  mailCoincidenceChecker();

  const showFormButton = () => {
    const a = formData.nombre;
    const b = formData.telefono;
    const c = mailCoincidenceChecker();
    if (c && a !== "" && b !== "") {
      return true;
    } else {
      return false;
    }
  };
  showFormButton();

  const handleSubmitForm = async (event) => {
    event.preventDefault();
    // le damos formato a los datos que vamos a subir a firebase
    // los datos del comprador :
    const order = {
      customer: { ...formData },
      products: { ...cart },
      total: totalPrice(),
      date: Timestamp.fromDate(new Date()),
    };
    try {
      //validamos el form
      const formResponse = await validateForm(formData);
      if (formResponse.status === "success") {
        //ejecutamos la subida a firebase
        generateOrderInFirebase(order);
      } else {
        toast.warning(formResponse.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };
  // subimos nuestra orden a firebase
  const generateOrderInFirebase = (order) => {
    // creo una coleccion dentro de la Firestore Database
    const ordersRef = collection(db, "orders");
    addDoc(ordersRef, order)
      .then((res) => setOrderId(res.id))
      .catch((error) => console.error(error))
      .finally(() => {
        //reducir el stock, importantisimo el orden antes de borrar el carrito
        updateStock();
        //luego de que se subio la orden vaciamos el carrito
        deleteCart();
      });
  };

  const updateStock = () => {
    cart.map((cartProduct) => {
      // declaramos y guardamos la cantidad para luego restarla en el stock
      let quantity = cartProduct.quantity;
      //borramos el campo quantity ya que nuestros objetos en la db no poseen esta key
      delete cartProduct.quantity;

      const productRef = doc(db, "products", cartProduct.id);
      setDoc(productRef, {
        ...cartProduct,
        stock: cartProduct.stock - quantity,
      })
        .then(() => console.log("Stock actulizado correctamente"))
        .catch((error) => console.error(error));
    });
  };

  return (
    <div>
      {orderId ? (
        <div>
          <h2> Orden generada con exito!</h2>
          <p> Guarda el id de tu orden: {orderId}</p>
        </div>
      ) : (
        <Form
          formData={formData}
          handleChangeInput={handleChangeInput}
          handleSubmitForm={handleSubmitForm}
          mailCoincidenceChecker={mailCoincidenceChecker}
          showFormButton={showFormButton}
        />
      )}
    </div>
  );
};

export default Checkout;
